import test from 'node:test';
import assert from 'node:assert/strict';
import {outputSeries} from '../src/ui/exploration-results';
import type {Expression} from '../src/model/types';
test('curve readouts match an actual curve expression at a single coordinate',()=>{
 const curve:Expression={op:'add',args:[{op:'mul',args:['slope','x']},'intercept']};
 assert.equal(outputSeries({op:'add',args:[{op:'mul',args:['slope',3]},'intercept']},[{expression:curve}]),0);
 assert.equal(outputSeries({op:'sub',args:[curve,1]},[{expression:curve}]),-1);
 assert.equal(outputSeries('slope',[{expression:curve}]),-1);
 const repeated:Expression={op:'mul',args:['x','x']};
 assert.equal(outputSeries({op:'mul',args:[2,3]},[{expression:repeated}]),-1);
 assert.equal(outputSeries({op:'mul',args:[2,2]},[{expression:repeated}]),0);
});
