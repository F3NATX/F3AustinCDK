#!/usr/bin/env node
import * as cdk from '@aws-cdk/core';
import { F3AustinCdkStack } from '../lib/f3_austin_cdk-stack';

const app = new cdk.App();
new F3AustinCdkStack(app, 'F3AustinCdkStack', {
    env: {
        account: '455224517414',
        region: 'us-east-1'
    }
});
