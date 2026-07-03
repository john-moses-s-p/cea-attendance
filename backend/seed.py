"""
Create the first Super Admin account.
Usage:
    python seed.py admin@student.tce.edu "Association Super Admin" ChangeMe@123
"""
import sys
from app import create_app
from extensions import db
from models import User


def main():
    if len(sys.argv) != 4:
        print("Usage: python seed.py <email> <name> <password>")
        sys.exit(1)

    email, name, password = sys.argv[1], sys.argv[2], sys.argv[3]
    app = create_app()

    with app.app_context():
        if User.query.filter_by(email=email).first():
            print(f"User {email} already exists.")
            return

        user = User(email=email, name=name, role="super_admin",
                    is_active=True, is_email_verified=True)
        user.set_password(password)
        db.session.add(user)
        db.session.commit()
        print(f"Super admin created: {email}")


if __name__ == "__main__":
    main()
