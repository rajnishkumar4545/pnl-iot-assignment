import os
import json
import decimal
import logging
import boto3
from boto3.dynamodb.types import TypeSerializer, TypeDeserializer, DYNAMODB_CONTEXT
from geopy.distance import geodesic as GD
from botocore.exceptions import ClientError


REFERENCE_TABLE_NAME = os.environ["REFERENCE_TABLE_NAME"]
VEHICLE_TABLE_NAME = os.environ["VEHICLE_TABLE_NAME"]
DEVICE_TABLE_NAME = os.environ["DEVICE_TABLE_NAME"]
SNS_ARN = os.environ["SNS_ARN"]

# Inhibit Inexact Exceptions
DYNAMODB_CONTEXT.traps[decimal.Inexact] = 0
# Inhibit Rounded Exceptions
DYNAMODB_CONTEXT.traps[decimal.Rounded] = 0


class IotEventsHandler:
    def __init__(self):
        self.logger = logging.getLogger("_name_")
        self.logger.setLevel(os.environ.get("LOG_LEVEL", logging.INFO))
        self.dynamodb_client = boto3.client("dynamodb")
        self.sns_client = boto3.client("sns")
        self.deserializer = TypeDeserializer()

    def read_input_event(self, event):
        input_row = {}
        if event.get("Records") is not None:
            for record in event["Records"]:
                if record["eventName"] == "INSERT" or record["eventName"] == "MODIFY":
                    input_row = record["dynamodb"]["NewImage"]

        device_data = {
            k: self.deserializer.deserialize(v) for k, v in input_row.items()
        }
        self.logger.info(device_data)

        return device_data

    def get_vehicle_device_mapping_result(self, device_id):
        try:
            vehicle_mobile_mapping_result = self.dynamodb_client.get_item(
                TableName=REFERENCE_TABLE_NAME, Key={"device_mac_address": {"S": device_id}}
            )
            if vehicle_mobile_mapping_result.get("Item") is not None:
                vehicle_mac_address = (
                vehicle_mobile_mapping_result.get("Item")
                .get("vehicle_mac_address")
                .get("S")
            )
                self.logger.info(f"Vehicle mac address  = {vehicle_mac_address}")
                return vehicle_mac_address
            else:
                self.logger.info(f"Record not available in dynamodb table")
                return "EMPTY_RECORD"

        except ClientError as e:
            self.logger.error(e.response["Error"]["Message"])
            raise e            


    def get_vehicle_result(self, vehicle_mac_address):

        try:
            vehicle_result = self.dynamodb_client.get_item(
                TableName=VEHICLE_TABLE_NAME,
                Key={"vehicle_mac_address": {"S": vehicle_mac_address}},
            )

            self.logger.info(f"RESPONSE = {vehicle_result}")

            if vehicle_result.get("Item") is not None:
                vehicle_data = {
                    k: self.deserializer.deserialize(v)
                    for k, v in vehicle_result["Item"].items()
                }

                self.logger.info(f"vehicle_data  = {vehicle_data}")
                return vehicle_data

            else:
                self.logger.info(f"Record not available in dynamodb table")
                return "EMPTY_vehicle_record"
        
        except ClientError as e:
            self.logger.error(e.response["Error"]["Message"])
            raise e  

    def calculate_distance_between_points(self, device_data, vehicle_data):
        vehicle_coordinates = (vehicle_data["latitude"], vehicle_data["longitude"])
        device_coordinates = (device_data["latitude"], device_data["longitude"])

        distance = GD(vehicle_coordinates, device_coordinates).meters
        self.logger.info(f"distance  = {distance}")
        return distance

    def send_msg_to_sns(self, distance, device_data, vehicle_data, sns_arn):
        if distance >= 50:
            message = {
                "alertType": "50mApartDelivery",
                "handheldId": device_data["device_mac_address"],
                "vehicleId": vehicle_data["vehicle_mac_address"],
                "latitude": vehicle_data["latitude"],
                "longitude": vehicle_data["longitude"],
            }

            try:
                response = self.sns_client.publish(
                    TopicArn=sns_arn,
                    Message=json.dumps(message, default=str),
                    Subject=f"50mApartDelivery {vehicle_data['vehicle_mac_address']}",
                )

                self.logger.info(f"response  = {response}")
            except ClientError as e:
                self.logger.error(e.response["Error"]["Message"])
                raise e  

    def process_event(self, event):
        self.logger.info("Event processing started ...")

        ## 1. Get device row data from dynamodb input event stream
        device_data = self.read_input_event(event)

        ## 2. Get Vehicle mac address using device mac add from ref table
        vehicle_mac_address = self.get_vehicle_device_mapping_result(
            device_data.get("device_mac_address")
        )

        ## 3. Get Vehicle detail from vehicle table
        vehicle_data = {}
        if vehicle_mac_address != "EMPTY_RECORD":
            vehicle_data = self.get_vehicle_result(vehicle_mac_address)

            ## 4. Get distance beteen vehicle and device:
            distance = self.calculate_distance_between_points(device_data, vehicle_data)

            ## 5. Send notification to SNS topic
            self.send_msg_to_sns(distance, device_data, vehicle_data, SNS_ARN)
        else:
            self.logger.info(f"No matching record found in Vehicle table.")
        self.logger.info("Event Processing completed!!!")


def lambda_handler(event, _):
    return IotEventsHandler().process_event(event)
