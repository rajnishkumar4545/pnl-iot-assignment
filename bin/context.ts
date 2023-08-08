interface Context {
    referenceTableName: string;
    referenceTablePartitionkey: string;
    vehicleTableName: string;
    vehicleTablePartitionKey: string;
    deviceTableName: string;
    deviceTablePartitionKey: string;
    lambdaLayerName: string;
    lambdaFunctionName: string;
    lambdaAliasName: string;
    snsTopicArn: string;
  }
  
  export const dev: Context = {
    referenceTableName: 'vehicle_device_mapping_table',
    referenceTablePartitionkey: 'device_mac_address',
    vehicleTableName: 'vehicle_table',
    vehicleTablePartitionKey: 'vehicle_mac_address',
    deviceTableName: 'device_table',
    deviceTablePartitionKey: 'device_mac_address',
    lambdaLayerName: 'events-handler-lambda-layer',
    lambdaFunctionName: 'events-handler-lambda-function',
    lambdaAliasName: 'events-handler-lambda-alias',
    snsTopicArn: 'arn:aws:sns:ap-south-1:189351993567:demo-sns-topic',
  };
  
  export const tst: Context = {
    referenceTableName: 'vehicle_device_mapping_table',
    referenceTablePartitionkey: 'device_mac_address',
    vehicleTableName: 'vehicle_table',
    vehicleTablePartitionKey: 'vehicle_mac_address',
    deviceTableName: 'device_table',
    deviceTablePartitionKey: 'device_mac_address',
    lambdaLayerName: 'events-handler-lambda-layer',
    lambdaFunctionName: 'events-handler-lambda-function',
    lambdaAliasName: 'events-handler-lambda-alias',
    snsTopicArn: 'arn:aws:sns:ap-south-1:189351993567:demo-sns-topic',
  };
  