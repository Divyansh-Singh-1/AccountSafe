import requests
import hashlib
import secrets
import sys

BASE_URL = "http://localhost:8000/api"

def generate_salt():
    return secrets.token_hex(16)

def generate_auth_hash(password, salt):
    data = f"{password}{salt}accountsafe-auth".encode("utf-8")
    return hashlib.sha256(data).hexdigest()

def run_verification():
    username = f"verify_user_{secrets.token_hex(4)}"
    password = "MasterPassword123!"
    salt = generate_salt()
    auth_hash = generate_auth_hash(password, salt)

    print(f"--- Running flow verification for user: {username} ---")

    # 1. Register
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

    # 2. Setup Duress credentials
    duress_pwd = "DuressPassword999!"
    duress_salt = generate_salt()
    duress_auth_hash = generate_auth_hash(duress_pwd, duress_salt)

    set_duress_url = f"{BASE_URL}/zk/set-duress/"
    duress_data = {
        "master_auth_hash": auth_hash,
        "duress_auth_hash": duress_auth_hash,
        "duress_salt": duress_salt,
        "sos_email": "sos_notify@example.com"
    }
    r = requests.post(set_duress_url, json=duress_data, headers=headers)
    if r.status_code != 200:
        print(f"FAIL: Set Duress failed with {r.status_code}: {r.text}")
        sys.exit(1)
    print("PASS: Set Duress credentials successful")

    # 3. Test ZK Login with Duress (Single-Request Dual-Hash)
    login_url = f"{BASE_URL}/zk/login/"
    login_data = {
        "username": username,
        "auth_hash": "incorrect_master_auth_hash",
        "duress_auth_hash": duress_auth_hash
    }
    r = requests.post(login_url, json=login_data)
    if r.status_code != 200:
        print(f"FAIL: Duress login failed with {r.status_code}: {r.text}")
        sys.exit(1)
    
    resp_data = r.json()
    if not resp_data.get("is_duress"):
        print(f"FAIL: Login response is_duress is not True: {resp_data}")
        sys.exit(1)
    if resp_data.get("salt") != duress_salt:
        print(f"FAIL: Login response salt is not duress_salt: {resp_data}")
        sys.exit(1)
    print("PASS: Single-Request Dual-Hash login for Duress was successful")

    # 4. Test Master Password Change
    new_password = "NewMasterPassword456!"
    new_salt = generate_salt()
    new_auth_hash = generate_auth_hash(new_password, new_salt)

    change_pw_url = f"{BASE_URL}/zk/change-password/"
    change_pw_data = {
        "current_auth_hash": auth_hash,
        "new_auth_hash": new_auth_hash,
        "new_salt": new_salt
    }
    r = requests.post(change_pw_url, json=change_pw_data, headers=headers)
    if r.status_code != 200:
        print(f"FAIL: Change password failed with {r.status_code}: {r.text}")
        sys.exit(1)
    print("PASS: Change password successful")

    # 5. Verify Login with New Master Password
    login_data = {
        "username": username,
        "auth_hash": new_auth_hash
    }
    r = requests.post(login_url, json=login_data)
    if r.status_code != 200:
        print(f"FAIL: Login with new password failed with {r.status_code}: {r.text}")
        sys.exit(1)
    
    resp_data = r.json()
    if resp_data.get("is_duress"):
        print("FAIL: Login with new master password was classified as duress login")
        sys.exit(1)
    if resp_data.get("salt") != new_salt:
        print(f"FAIL: Login with new master password returned wrong salt: {resp_data}")
        sys.exit(1)
    print("PASS: Login with new master password successful")
    print("--- ALL VERIFICATION FLOWS PASSED SUCCESSFULLY ---")

if __name__ == "__main__":
    run_verification()
