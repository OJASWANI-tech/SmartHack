"""
Creates or updates a committee member account.
Manage committee member accounts.
Run from backend/ folder: python scripts/seed_committee.py
"""

import getpass
import sys, os, asyncio
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv()

from app.db.session import AsyncSessionLocal
from app.crud.committee import get_member_by_email, create_member, update_member, delete_member, list_members

async def seed():
    print("\n── Committee Member Manager ──")
    print("1. Add / update member")
    print("2. Delete member")
    print("3. List all members")
    print("4. Exit")
    choice = input("\nChoice: ").strip()

    async with AsyncSessionLocal() as db:

        if choice == "1":
            name     = input("Full name: ")
            email    = input("Email: ")
            password = getpass.getpass("Password: ")
            role     = input("Role (admin/member) [default: member]: ").strip() or "member"
            from app.core.password import hash_password

            existing = await get_member_by_email(db, email)
            if existing:
                confirm = input(f"\nMember '{existing.email}' already exists. Update? (y/n): ")
                if confirm.lower() != "y":
                    print("Aborted.")
                    return
                member = await update_member(db, existing, name=name,
                                             hashed_password=hash_password(password), role=role)
                print(f"\nUpdated: {member.email} (id={member.id}) role={member.role}")
            else:
                member = await create_member(db, name=name, email=email,
                                             hashed_password=hash_password(password), role=role)
                print(f"\nCreated: {member.email} (id={member.id})")

        elif choice == "2":
            email = input("Email of member to delete: ")
            existing = await get_member_by_email(db, email)
            if not existing:
                print(f"No member found with email '{email}'.")
                return
            confirm = input(f"Are you sure you want to delete '{existing.name}' ({existing.email})? (y/n): ")
            if confirm.lower() != "y":
                print("Aborted.")
                return
            await delete_member(db, existing)
            print(f"\nDeleted: {email}")

        elif choice == "3":
            members = await list_members(db)
            if not members:
                print("No committee members found.")
                return
            print(f"\n{'ID':<6} {'Name':<25} {'Email':<35} {'Role':<10} {'Active'}")
            print("─" * 75)
            for m in members:
                print(f"{m.id:<6} {m.name:<25} {m.email:<35} {m.role:<10} {m.is_active}")

        elif choice == "4":
            print("Bye.")

        else:
            print("Invalid choice.")

if __name__ == "__main__":
    asyncio.run(seed())


# async def bulk_seed():
#     """Seed multiple committee admins from .env file."""
#     from app.core.password import hash_password

#     members = [
#         {
#             "name": os.getenv("SEED_ADMIN_1_NAME", ""),
#             "email": os.getenv("SEED_ADMIN_1_EMAIL", ""),
#             "password": os.getenv("SEED_ADMIN_1_PASSWORD", ""),
#             "role": "admin",
#         },
#         {
#             "name": os.getenv("SEED_ADMIN_2_NAME", ""),
#             "email": os.getenv("SEED_ADMIN_2_EMAIL", ""),
#             "password": os.getenv("SEED_ADMIN_2_PASSWORD", ""),
#             "role": "admin",
#         },
#         {
#             "name": os.getenv("SEED_ADMIN_3_NAME", ""),
#             "email": os.getenv("SEED_ADMIN_3_EMAIL", ""),
#             "password": os.getenv("SEED_ADMIN_3_PASSWORD", ""),
#             "role": "admin",
#         },
 #        {
#             "name": os.getenv("SEED_ADMIN_4_NAME", ""),
#             "email": os.getenv("SEED_ADMIN_4_EMAIL", ""),
#             "password": os.getenv("SEED_ADMIN_4_PASSWORD", ""),
#             "role": "admin",
#         },
#     ]

#     async with AsyncSessionLocal() as db:
#         for m in members:
#             if not m["email"] or not m["password"]:
#                 print(f"[SKIP] Missing email or password for '{m['name']}'")
#                 continue
#             existing = await get_member_by_email(db, m["email"])
#             if existing:
#                 print(f"[SKIP] {m['email']} already exists")
#                 continue
#             member = await create_member(
#                 db,
#                 name=m["name"],
#                 email=m["email"],
#                 hashed_password=hash_password(m["password"]),
#                 role=m["role"],
#             )
#             print(f"[CREATED] {member.email} ({member.role})")


# if __name__ == "__main__":
#     if len(sys.argv) > 1 and sys.argv[1] == "bulk":
#         asyncio.run(bulk_seed())
#     else:
#         asyncio.run(seed())