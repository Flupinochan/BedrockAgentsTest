#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';

import { BedrockAgentsTestStack} from '../lib/bedrock_agents_test-stack';
import {Parameters} from '../lib/parameters';

const param = new Parameters();

const app = new cdk.App();
new BedrockAgentsTestStack(app, 'BedrockAgentsTestStack', {
  env: {
    region: param.env.region,
  }
});