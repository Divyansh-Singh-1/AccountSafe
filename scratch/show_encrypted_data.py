import os
import django
import sys
import json

# Setup Django environment
sys.path.append(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "backend"))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.contrib.auth.models import User
from api.models import UserProfile, Profile, Category, Organization

def main():
    print("=" * 80)
    print("              ACCOUNTSAFE - DATABASE ENCRYPTED VALUES DUMP")
    print("=" * 80)
    print("This script dumps the actual encrypted ciphertexts stored in the database.")
    print("Because AccountSafe uses client-side zero-knowledge encryption, the server")
    print("only stores encrypted blobs and IVs, and has no way to decrypt them.")
    print("=" * 80)

    users = User.objects.all()
    if not users.exists():
        print("No users found in the database.")
        return

    for user in users:
        print(f"\n[USER]: {user.username} (Email: {user.email})")
        print("-" * 50)
        
        # Try to get UserProfile
        try:
            profile = user.userprofile
            print(f"User Profile encryption details:")
            print(f"  - Encryption Salt:  {profile.encryption_salt}")
            print(f"  - Duress Salt:      {profile.duress_salt}")
            print(f"  - Auth Hash (SHA256): {profile.auth_hash}")
            print(f"  - Duress Auth Hash: {profile.duress_auth_hash}")
            
            # Show vault blob (often long, so truncate if huge, or show prefix/suffix)
            if profile.vault_blob:
                print(f"  - Encrypted Vault Blob (Client AES-GCM):")
                print(f"      {profile.vault_blob[:120]}... [truncated, total length: {len(profile.vault_blob)} chars]")
            else:
                print(f"  - Encrypted Vault Blob: None/Empty")

            if profile.decoy_vault_blob:
                print(f"  - Encrypted Decoy Vault Blob:")
                print(f"      {profile.decoy_vault_blob[:120]}... [truncated, total length: {len(profile.decoy_vault_blob)} chars]")
            else:
                print(f"  - Encrypted Decoy Vault Blob: None/Empty")
                
        except UserProfile.DoesNotExist:
            print("  No UserProfile model linked to this user.")

        # Let's get Categories, Orgs, and Profiles (Credentials)
        user_categories = Category.objects.filter(user=user)
        print(f"\n  Stored Credentials in Database for {user.username}:")
        
        profiles_found = False
        for cat in user_categories:
            orgs = Organization.objects.filter(category=cat)
            for org in orgs:
                db_profiles = Profile.objects.filter(organization=org)
                for p in db_profiles:
                    profiles_found = True
                    print(f"    * Title (Stored in plaintext): {p.title or 'Untitled'} (Org: {org.name}, Category: {cat.name})")
                    print(f"      - Username (Encrypted):  {p.username_encrypted}")
                    print(f"      - Username IV:           {p.username_iv}")
                    print(f"      - Password (Encrypted):  {p.password_encrypted}")
                    print(f"      - Password IV:           {p.password_iv}")
                    if p.email_encrypted:
                        print(f"      - Email (Encrypted):     {p.email_encrypted}")
                        print(f"      - Email IV:              {p.email_iv}")
                    if p.notes_encrypted:
                        print(f"      - Notes (Encrypted):     {p.notes_encrypted}")
                        print(f"      - Notes IV:              {p.notes_iv}")
                    print(f"      - Password Strength:     {p.password_strength} (zxcvbn score)")
                    print(f"      - Password Hash:         {p.password_hash or 'None'}")
                    print(f"      - Soft Deleted:          {p.is_in_trash()} (Deleted At: {p.deleted_at})")
                    print()
        
        if not profiles_found:
            print("    No encrypted credentials found in the standard profiles table.")
            print("    (Note: If the frontend uses the unified vault_blob mode, all credentials")
            print("     are stored in the encrypted vault_blob field shown above rather than")
            print("     separate database columns, depending on sync type.)")
            
    print("=" * 80)

if __name__ == "__main__":
    main()
