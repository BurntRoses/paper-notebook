#!/usr/bin/env node
import {tsImport} from 'tsx/esm/api';
await tsImport('./cli.ts',import.meta.url);
