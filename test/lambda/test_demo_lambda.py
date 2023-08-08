import os
import logging
import json
import pytest
import boto3
import botocore
from unittest import TestCase, mock
from botocore.exceptions import ClientError

from moto import mock_sns, mock_dynamodb

MOTO_REGION = "us-east-1"
REFERENCE_TABLE_NAME = "fake_reference_table"
VEHICLE_TABLE_NAME = "fake_vehicle_table"
DEVICE_TABLE_NAME = "fake_device_table"
SNS_ARN = "fake_sns_arn"
BOTO3_ORIG_MAKE_API_CALL = botocore.client.BaseClient._make_api_call

FAKE_INPUT_EVENT = {
            "Records": [
                {
                    "eventID": "e7fc49dffab0943b20804a1508a7ca7b",
                    "eventName": "MODIFY",
                    "eventVersion": "1.1",
                    "eventSource": "aws:dynamodb",
                    "awsRegion": "dummy-region",
                    "dynamodb": {
                        "ApproximateCreationDateTime": 1691495758.0,
                        "Keys": {
                            "device_mac_address": {
                                "S": "AA:BB:CC:DD"
                            }
                        },
                        "NewImage": {
                            "latitude": {
                                "S": "22.561378"
                            },
                            "device_mac_address": {
                                "S": "AA:BB:CC:DD"
                            },
                            "longitude": {
                                "S": "88.36707583333333"
                            }
                        },
                        "SequenceNumber": "7196600000000003811587147",
                        "SizeBytes": 101,
                        "StreamViewType": "NEW_IMAGE"
                    },
                    "eventSourceARN": "arn:aws:dynamodb:dummy-region:189351993567:table/demo-device-table/stream/2023-08-06T21:12:13.545"
                }
            ]
        }

@mock_sns
@mock_dynamodb
@mock.patch.dict(os.environ, {"SNS_ARN": SNS_ARN})
@mock.patch.dict(os.environ, {"AWS_DEFAULT_REGION": MOTO_REGION})
@mock.patch.dict(os.environ, {"DEVICE_TABLE_NAME": DEVICE_TABLE_NAME})
@mock.patch.dict(os.environ, {"VEHICLE_TABLE_NAME": VEHICLE_TABLE_NAME})
@mock.patch.dict(os.environ, {"REFERENCE_TABLE_NAME": REFERENCE_TABLE_NAME})
class DemoLambdaTests(TestCase):
    def setUp(self):
        self.logger = logging.getLogger("__name__")
        self.logger.setLevel(os.environ.get("LOG_LEVEL", logging.INFO))
        self.dynamodb_client = boto3.client("dynamodb", region_name=MOTO_REGION)

        self.ref_table  = self.dynamodb_client.create_table(
            TableName=REFERENCE_TABLE_NAME,
            KeySchema=[
                {"AttributeName": "device_mac_address", "KeyType": "HASH"},
            ],
            AttributeDefinitions=[
                {"AttributeName": "device_mac_address", "AttributeType": "S"},
            ],
            ProvisionedThroughput={"ReadCapacityUnits": 5, "WriteCapacityUnits": 5},
        )
        self.vehicle_table  = self.dynamodb_client.create_table(
            TableName=VEHICLE_TABLE_NAME,
            KeySchema=[
                {"AttributeName": "vehicle_mac_address", "KeyType": "HASH"},
            ],
            AttributeDefinitions=[
                {"AttributeName": "vehicle_mac_address", "AttributeType": "S"},
            ],
            ProvisionedThroughput={"ReadCapacityUnits": 5, "WriteCapacityUnits": 5},
        )

        self.device_table  = self.dynamodb_client.create_table(
            TableName=DEVICE_TABLE_NAME,
            KeySchema=[
                {"AttributeName": "device_mac_address", "KeyType": "HASH"},
            ],
            AttributeDefinitions=[
                {"AttributeName": "device_mac_address", "AttributeType": "S"},
            ],
            ProvisionedThroughput={"ReadCapacityUnits": 5, "WriteCapacityUnits": 5},
        )

        self.write_to_dynamodb_ref_table()
        self.write_to_dynamodb_vehicle_table()
  
    def write_to_dynamodb_ref_table(self):
        return self.dynamodb_client.put_item(
            TableName = REFERENCE_TABLE_NAME,
            Item={
                "device_mac_address":  { "S" : "AA:BB:CC:DD" },
                "vehicle_mac_address": { "S" : "BB:CC:DD:EE" }
            }
        )

    def write_to_dynamodb_vehicle_table(self):
        return self.dynamodb_client.put_item(
            TableName = VEHICLE_TABLE_NAME,
            Item={
                "vehicle_mac_address":  { "S" : "BB:CC:DD:EE" },
                "longitude": { "S" : "10.12" },
                "latitude": { "S" : "88.44" },
            }
        )
    
    def test_read_input_event(self):
        from demo_lambda import DemoLambda

        obj = DemoLambda()
        response = obj.read_input_event(FAKE_INPUT_EVENT)
        assert response.get("latitude") == "22.561378"
        assert response.get("longitude") == "88.36707583333333"
        assert response.get("device_mac_address") == "AA:BB:CC:DD"

    def test_get_vehicle_device_mapping_result(self):

        from demo_lambda import DemoLambda
        obj = DemoLambda()

        FAKE_DEVICE_ID = "AA:BB:CC:DD"
        response = obj.get_vehicle_device_mapping_result(FAKE_DEVICE_ID)

        assert response == "BB:CC:DD:EE"

    def test_get_vehicle_result_when_no_data_in_dynamodb(self):
        from demo_lambda import DemoLambda
        obj = DemoLambda()

        FAKE_VEHICLE_ID = "BB:CC:DD:EE"

        response = obj.get_vehicle_result(FAKE_VEHICLE_ID)

        assert response.get("latitude") == "88.44"
        assert response.get("longitude") == "10.12"
        assert response.get("vehicle_mac_address") == "BB:CC:DD:EE"

    def tearDown(self):
        ...