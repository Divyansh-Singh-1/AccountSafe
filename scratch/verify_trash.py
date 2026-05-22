import requests
import secrets
import sys

BASE_URL = "http://localhost:8000/api"

def run_trash_verification():
    username = f"trash_user_{secrets.token_hex(4)}"
    password = "MasterPassword123!"
    
    # 1. Register a test user
    import hashlib
    def generate_salt():
        return secrets.token_hex(16)
    def generate_auth_hash(pwd, salt):
        return hashlib.sha256(f"{pwd}{salt}accountsafe-auth".encode("utf-8")).hexdigest()

    salt = generate_salt()
    auth_hash = generate_auth_hash(password, salt)
    
    print(f"--- Running Trash verification for user: {username} ---")
    
    reg_url = f"{BASE_URL}/zk/register/"
    reg_data = {
        "username": username,
        "email": f"{username}@example.com",
        "auth_hash": auth_hash,
        "salt": salt
    }
    r = requests.post(reg_url, json=reg_data)
    if r.status_code != 201:
        print(f"FAIL: Registration failed with {r.status_code}: {r.text}")
        sys.exit(1)
    print("PASS: Registration successful")
    token = r.json()["key"]
    headers = {"Authorization": f"Token {token}"}

    # 2. Create Category
    cat_url = f"{BASE_URL}/categories/"
    cat_data = {"name": "Trash Test Category", "description": "Category for testing trash"}
    r = requests.post(cat_url, json=cat_data, headers=headers)
    if r.status_code != 201:
        print(f"FAIL: Category creation failed: {r.status_code} {r.text}")
        sys.exit(1)
    cat_id = r.json()["id"]
    print(f"PASS: Created Category ID={cat_id}")

    # 3. Create Organization
    org_url = f"{BASE_URL}/categories/{cat_id}/organizations/"
    org_data = {"name": "Trash Test Org"}
    r = requests.post(org_url, json=org_data, headers=headers)
    if r.status_code != 201:
        print(f"FAIL: Organization creation failed: {r.status_code} {r.text}")
        sys.exit(1)
    org_id = r.json()["id"]
    print(f"PASS: Created Organization ID={org_id}")

    # 4. Create Profile
    prof_url = f"{BASE_URL}/categories/{cat_id}/organizations/{org_id}/profiles/"
    # Wait, the URL is "/api/organizations/<int:organization_id>/profiles/" in core/urls.py
    # let's try the correct route
    prof_url = f"{BASE_URL}/organizations/{org_id}/profiles/"
    prof_data = {
        "title": "Trash Test Profile",
        "username_encrypted": "enc_user",
        "username_iv": "iv_user",
        "password_encrypted": "enc_pass",
        "password_iv": "iv_pass"
    }
    r = requests.post(prof_url, json=prof_data, headers=headers)
    if r.status_code != 201:
        print(f"FAIL: Profile creation failed: {r.status_code} {r.text}")
        sys.exit(1)
    profile_id = r.json()["id"]
    print(f"PASS: Created Profile ID={profile_id}")

    # 5. List profiles under organization, make sure it is there
    r = requests.get(prof_url, headers=headers)
    if r.status_code != 200 or len(r.json()) != 1:
        print(f"FAIL: Listing profiles should return 1 profile: {r.status_code} {r.text}")
        sys.exit(1)
    print("PASS: Verified profile is active under organization")

    # 6. Soft Delete Profile (POST / DELETE to profiles/<id>/ ?)
    # Let's check what HTTP method soft delete is: DELETE /api/profiles/<id>/
    delete_url = f"{BASE_URL}/profiles/{profile_id}/"
    r = requests.delete(delete_url, headers=headers)
    if r.status_code != 200:
        print(f"FAIL: Soft delete failed: {r.status_code} {r.text}")
        sys.exit(1)
    print("PASS: Soft deleted profile successfully")

    # 7. List profiles under organization again, should be empty (since soft-deleted)
    r = requests.get(prof_url, headers=headers)
    if r.status_code != 200 or len(r.json()) != 0:
        print(f"FAIL: Listing profiles should now return 0 active profiles: {r.status_code} {r.text}")
        sys.exit(1)
    print("PASS: Profile is no longer returned in active list")

    # 8. List trash profiles (GET /api/profiles/trash/)
    trash_url = f"{BASE_URL}/profiles/trash/"
    r = requests.get(trash_url, headers=headers)
    if r.status_code != 200 or len(r.json()) != 1:
        print(f"FAIL: Listing trash should return 1 profile: {r.status_code} {r.text}")
        sys.exit(1)
    print("PASS: Profile is present in trash list")
    days_rem = r.json()[0]["days_remaining"]
    print(f"Trash item has days_remaining: {days_rem}")

    # 9. Restore profile (POST /api/profiles/<id>/restore/)
    restore_url = f"{BASE_URL}/profiles/{profile_id}/restore/"
    r = requests.post(restore_url, headers=headers)
    if r.status_code != 200:
        print(f"FAIL: Restore profile failed: {r.status_code} {r.text}")
        sys.exit(1)
    print("PASS: Restored profile successfully")

    # 10. List profiles again, should return 1 active profile
    r = requests.get(prof_url, headers=headers)
    if r.status_code != 200 or len(r.json()) != 1:
        print(f"FAIL: Listing profiles after restore should return 1 profile: {r.status_code} {r.text}")
        sys.exit(1)
    print("PASS: Profile is active again")

    # 11. Soft-delete again to test shredding
    r = requests.delete(delete_url, headers=headers)
    if r.status_code != 200:
        print(f"FAIL: Second soft-delete failed: {r.status_code}")
        sys.exit(1)

    # 12. Shred profile (DELETE /api/profiles/<id>/shred/)
    # Payload: {"confirm": "PERMANENTLY_DELETE"}
    shred_url = f"{BASE_URL}/profiles/{profile_id}/shred/"
    # Try first without confirmation (should fail)
    r = requests.delete(shred_url, headers=headers)
    if r.status_code != 400:
        print(f"FAIL: Shred without confirmation should return 400: {r.status_code} {r.text}")
        sys.exit(1)
    print("PASS: Shred request without confirmation correctly rejected")

    # Try with correct confirmation
    r = requests.delete(shred_url, json={"confirm": "PERMANENTLY_DELETE"}, headers=headers)
    if r.status_code != 200:
        print(f"FAIL: Shred failed: {r.status_code} {r.text}")
        sys.exit(1)
    print("PASS: Shred (permanent crypto-deletion) successful")

    # 13. Verify profile is gone completely
    r = requests.get(trash_url, headers=headers)
    if r.status_code != 200 or len(r.json()) != 0:
        print(f"FAIL: Trash should be empty after shredding: {r.status_code} {r.text}")
        sys.exit(1)
    print("PASS: Verified profile is completely gone from trash")
    
    print("--- ALL TRASH / RECYCLE BIN FLOWS PASSED SUCCESSFULLY ---")

if __name__ == "__main__":
    run_trash_verification()
