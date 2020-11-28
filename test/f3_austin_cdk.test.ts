import { expect as expectCDK, haveResource } from '@aws-cdk/assert';
import * as cdk from '@aws-cdk/core';
import * as F3AustinCdk from '../lib/f3_austin_cdk-stack';

test('EC2 Instance Created', () => {
    const app = new cdk.App();
    // WHEN
    const stack = new F3AustinCdk.F3AustinCdkStack(app, 'MyTestStack');
    // THEN
    expectCDK(stack).to(haveResource("AWS::EC2::Instance",{
      InstanceType: "t2.micro",
    }));
});