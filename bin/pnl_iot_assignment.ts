#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { PnlIotAssignmentStack } from '../lib/pnl_iot_assignment-stack';
import * as context from './context';



/*
** Environment variables
*/
const environment = 'dev';
const envContext = context[environment];

const tags = {
  Environment: environment,
  ResourceContact: 'Rajnish Kumar',
};


const app = new cdk.App({
    context: {
      environment,
    },
  });

new PnlIotAssignmentStack(app, 'PnlIotAssignmentStack', {
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