import argparse

from app.db import initialize_database
from app.seed import seed


def main() -> None:
    parser = argparse.ArgumentParser(description="UnitFlow 데이터베이스 관리 도구")
    subparsers = parser.add_subparsers(dest="command", required=True)

    subparsers.add_parser("init", help="현재 DATABASE_URL 기준으로 스키마를 생성")
    subparsers.add_parser("reset", help="현재 DATABASE_URL 기준으로 스키마를 초기화")
    subparsers.add_parser("seed", help="초기화 후 예시 데이터를 채움")

    args = parser.parse_args()

    if args.command == "init":
        initialize_database()
        print("데이터베이스 스키마 생성을 마쳤어.")
        return

    if args.command == "reset":
        initialize_database(reset=True)
        print("데이터베이스 스키마 초기화를 마쳤어.")
        return

    if args.command == "seed":
        seed()
        print("예시 데이터 적재를 마쳤어.")


if __name__ == "__main__":
    main()
