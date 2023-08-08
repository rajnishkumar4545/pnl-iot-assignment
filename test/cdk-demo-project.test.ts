import * as cdk from 'aws-cdk-lib';
import  * as test1 from 'aws-cdk-lib/assets'
import { Template } from 'aws-cdk-lib/assertions';

import { CdkDemoProjectStack } from '../lib/cdk-demo-project-stack';

// example test. To run these tests, uncomment this file along with the
// example resource in lib/demo1-stack.ts
// test('Should generate stack as expected by snapshot', () => {
//   const app = new cdk.App();
//     // WHEN
//   const stack = new CdkDemoProjectStack(app, 'CdkDemoProjectStack');
//     // THEN
//   //const template = Template.fromStack(stack);
//     expect(stack).tohavere
// });


describe('pnl assessment stack tests', () => {
    test('Should generate stack as expected by snapshot', () => {
    //   const app = new cdk.App();
    const app = new cdk.Stack();
      const stack = new CdkDemoProjectStack(app, 'CdkDemoProjectStack');
      const template = Template.fromStack(stack);
      expect(template.toJSON()).toMatchSnapshot();
    });
  });
