import * as cdk from 'aws-cdk-lib';
import  * as test1 from 'aws-cdk-lib/assets'
import { Template } from 'aws-cdk-lib/assertions';
import { PnlIotAssignmentStack } from '../lib/pnl_iot_assignment-stack';
import * as context from '../bin/context';

/*
** Environment variables
*/
const environment = 'dev';
const envContext = context[environment];

describe('pnl assessment stack tests', () => {
    test('Should generate stack as expected by snapshot', () => {
    const app = new cdk.App();
      const stack = new PnlIotAssignmentStack(app, 'CdkDemoProjectStack', {
        referenceTableName: envContext.referenceTableName,
    referenceTablePartitionkey: envContext.referenceTablePartitionkey,
    vehicleTableName: envContext.vehicleTableName,
    vehicleTablePartitionKey: envContext.vehicleTablePartitionKey,
    deviceTableName: envContext.deviceTableName,
    deviceTablePartitionKey: envContext.deviceTablePartitionKey,
    lambdaLayerName: envContext.lambdaLayerName,
    lambdaFunctionName: envContext.lambdaFunctionName,
    lambdaAliasName: envContext.lambdaAliasName,
    snsTopicArn: envContext.snsTopicArn,
      });
      const template = Template.fromStack(stack);
      expect(template.toJSON()).toMatchSnapshot();
    });
  });
