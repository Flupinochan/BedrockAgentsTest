import boto3
from botocore.config import Config


def main():
    config = Config(
        retries={"max_attempts": 30, "mode": "standard"},
        read_timeout=900,
        connect_timeout=900,
        region_name="us-west-2",
    )
    dynamodb_client = boto3.client("dynamodb", config=config)

    item1 = {
        "AccountID": {"N": "5555"},
        "AccountName": {"S": "John"},
        "AccountStatus": {"S": "Active"},
        "Reason": {"S": "Active"},
    }
    item2 = {
        "AccountID": {"N": "6666"},
        "AccountName": {"S": "Thomas"},
        "AccountStatus": {"S": "Pending"},
        "Reason": {"S": "InvalidIdDentification"},
    }
    item3 = {
        "AccountID": {"N": "7777"},
        "AccountName": {"S": "Manju"},
        "AccountStatus": {"S": "Pending"},
        "Reason": {"S": "InvalidAddressProof"},
    }
    items = [item1, item2, item3]

    table_name = "customerAccountStatus"
    for item in items:
        dynamodb_client.put_item(TableName=table_name, Item=item)


if __name__ == "__main__":
    main()
