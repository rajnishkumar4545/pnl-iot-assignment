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
SNS_TOPIC_NAME = "fake_sns_topic_name"
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
@mock.patch.dict(os.environ, {"SNS_TOPIC_NAME": SNS_TOPIC_NAME})
@mock.patch.dict(os.environ, {"AWS_DEFAULT_REGION": MOTO_REGION})
@mock.patch.dict(os.environ, {"DEVICE_TABLE_NAME": DEVICE_TABLE_NAME})
@mock.patch.dict(os.environ, {"VEHICLE_TABLE_NAME": VEHICLE_TABLE_NAME})
@mock.patch.dict(os.environ, {"REFERENCE_TABLE_NAME": REFERENCE_TABLE_NAME})
class IotEventsHandlerTests(TestCase):
    def setUp(self):
        self.logger = logging.getLogger("__name__")
        self.logger.setLevel(os.environ.get("LOG_LEVEL", logging.INFO))
        self.dynamodb_client = boto3.client("dynamodb", region_name=MOTO_REGION)
        self.sns_client = boto3.client("sns", region_name=MOTO_REGION)

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

        self.sns_topic_response = self.sns_client.create_topic(Name=SNS_TOPIC_NAME)
        
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
        from iot_events_handler import IotEventsHandler

        obj = IotEventsHandler()
        response = obj.read_input_event(FAKE_INPUT_EVENT)
        assert response.get("latitude") == "22.561378"
        assert response.get("longitude") == "88.36707583333333"
        assert response.get("device_mac_address") == "AA:BB:CC:DD"

    def test_get_vehicle_device_mapping_result(self):

        from iot_events_handler import IotEventsHandler
        obj = IotEventsHandler()

        FAKE_DEVICE_ID = "AA:BB:CC:DD"
        response = obj.get_vehicle_device_mapping_result(FAKE_DEVICE_ID)

        assert response == "BB:CC:DD:EE"

    def test_get_vehicle_result_when_no_data_in_dynamodb(self):
        from iot_events_handler import IotEventsHandler
        obj = IotEventsHandler()

        FAKE_VEHICLE_ID = "BB:CC:DD:EE"

        response = obj.get_vehicle_result(FAKE_VEHICLE_ID)

        assert response.get("latitude") == "88.44"
        assert response.get("longitude") == "10.12"
        assert response.get("vehicle_mac_address") == "BB:CC:DD:EE"

    def test_calculate_distance_between_points(self):
        
        from iot_events_handler import IotEventsHandler
        obj = IotEventsHandler()

        FAKE_DEVICE_DATA = { "latitude" : "22.561378" ,"longitude" : "88.36707583333333","vehicle_mac_address" : "AA:BB:CC:DD"  }
        FAKE_VEHICLE_DATA = { "latitude" : "88.44" ,"longitude" : "10.12","vehicle_mac_address" : "BB:CC:DD:EE"  }

        response = obj.calculate_distance_between_points(FAKE_DEVICE_DATA,FAKE_VEHICLE_DATA)
        assert response == 7471469.868782937

    def test_send_msg_to_sns(self):
        from iot_events_handler import IotEventsHandler
        obj = IotEventsHandler()

        DISTANCE = 70
        FAKE_DEVICE_DATA = { "latitude" : "22.561378" ,"longitude" : "88.36707583333333","device_mac_address" : "AA:BB:CC:DD"  }
        FAKE_VEHICLE_DATA = { "latitude" : "88.44" ,"longitude" : "10.12","vehicle_mac_address" : "BB:CC:DD:EE"  }
        SNS_ARN_OUPTUT = self.sns_topic_response.get("TopicArn")
        response = obj.send_msg_to_sns(DISTANCE,FAKE_DEVICE_DATA,FAKE_VEHICLE_DATA,SNS_ARN_OUPTUT)
        assert response == None

    def tearDown(self):
        ...