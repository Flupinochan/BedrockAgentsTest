import os
import boto3
import json
from botocore.config import Config
from typing import TypedDict

from LoggingClass import LoggingClass


# ----------------------------------------------------------------------
# Environment Variable Setting
# ----------------------------------------------------------------------
try:
    DYNAMODB_TABLE = os.environ["DYNAMODB_TABLE"]
    PRIMARY_KEY = os.environ["PRIMARY_KEY"]
except KeyError:
    raise Exception("Environment variable is not defined.")

# ----------------------------------------------------------------------
# Global Variable Setting
# ----------------------------------------------------------------------
try:
    config = Config(
        retries={"max_attempts": 30, "mode": "standard"},
        read_timeout=900,
        connect_timeout=900,
    )
    dynamodb_client = boto3.client("dynamodb", config=config)
except Exception:
    raise Exception("Boto3 client error")

# ----------------------------------------------------------------------
# Logger Setting
# ----------------------------------------------------------------------
try:
    logger = LoggingClass("DEBUG")
    log = logger.get_logger()
except Exception:
    raise Exception("Logger Setting failed")


# ----------------------------------------------------------------------
# Main Function
# ----------------------------------------------------------------------
def main(event):
    try:
        api_response = create_response(event)
        return api_response
    except Exception as e:
        log.error(f"エラーが発生しました: {e}")
        raise


# ----------------------------------------------------------------------
# Main Function
# ----------------------------------------------------------------------
def create_response(event):
    try:
        account_id = event["parameters"][0]["value"]
        log.debug(f"AccountID: {account_id}")
        response = dynamodb_client.get_item(
            TableName=DYNAMODB_TABLE,
            Key={
                PRIMARY_KEY: {
                    "N": account_id,
                }
            },
        )
        log.debug(response)
        if "Item" in response:
            response_item = json.dumps(response["Item"])
            status_code = 200
            # Add detail information from knowledge base
        else:
            response_item = json.dumps({"Error": "Account not found."})
            status_code = 404
        response_body = {
            "application/json": {
                "body": response_item,
            }
        }
        action_response = {
            "actionGroup": event["actionGroup"],
            "apiPath": event["apiPath"],
            "httpMethod": event["httpMethod"],
            "httpStatusCode": status_code,
            "responseBody": response_body,
        }
        api_response = {
            "messageVersion": event["messageVersion"],
            "response": action_response,
            "sessionAttributes": event["sessionAttributes"],
            "promptSessionAttributes": event["promptSessionAttributes"],
        }

        return api_response
    except Exception as e:
        log.error(f"エラーが発生しました: {e}")
        raise


# ----------------------------------------------------------------------
# Entry Point
# ----------------------------------------------------------------------
# {
#   'messageVersion': '1.0',
#   'agent': {
#     'alias': 'TSTALIASID',
#     'name': 'customerAccountStatusBedrock',
#     'version': 'DRAFT',
#     'id': '5HVV5V8VYJ'
#   },
#   'sessionId': '247574246160391',
#   'sessionAttributes': {},
#   'promptSessionAttributes': {},
#   'inputText': 'What is the status of accountID=5555?',
#   'apiPath': '/customerAccountStatusLambda/{AccountID}/',
#   'actionGroup': 'actionGroup1',
#   'httpMethod': 'GET',
#   'parameters': [
#     {
#       'name': 'AccountID',
#       'type': 'integer',
#       'value': '5555'
#     }
#   ]
# }


def lambda_handler(event, context):
    try:
        # Event(request) format from BedrockAgents
        # https://docs.aws.amazon.com/bedrock/latest/userguide/agents-lambda.html

        # OpenAPI Schema
        # https://docs.aws.amazon.com/ja_jp/bedrock/latest/userguide/agents-api-schema.html
        log.info(f"From BedrockAgents event: {event}")
        api_response = main(event)
        return api_response
    except Exception as e:
        log.error(f"エラーが発生しました: {e}")
        raise
