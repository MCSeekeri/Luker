import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import yaml from 'yaml';
import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals';
import { addMissingConfigValues } from '../src/config-init.js';

const oldEnvKey = 'SILLYTAVERN_DISABLETHUMBNAILS';
const newEnvKey = 'SILLYTAVERN_THUMBNAILS_ENABLED';

describe('addMissingConfigValues', () => {
    let tempDirectory;
    let configPath;

    beforeEach(() => {
        tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'sillytavern-config-'));
        configPath = path.join(tempDirectory, 'config.yaml');
        fs.writeFileSync(configPath, '{}\n');
        delete process.env[oldEnvKey];
        delete process.env[newEnvKey];
        jest.spyOn(console, 'log').mockImplementation(() => {});
        jest.spyOn(console, 'warn').mockImplementation(() => {});
    });

    afterEach(() => {
        delete process.env[oldEnvKey];
        delete process.env[newEnvKey];
        fs.rmSync(tempDirectory, { recursive: true, force: true });
        jest.restoreAllMocks();
    });

    test.each([
        ['false', 'true'],
        ['true', 'false'],
    ])('migrates the boolean environment value %s to %s', (oldValue, newValue) => {
        process.env[oldEnvKey] = oldValue;

        addMissingConfigValues(configPath);

        expect(process.env[newEnvKey]).toBe(newValue);
        expect(process.env[oldEnvKey]).toBeUndefined();
    });

    test('moves luker.generationAckGraceMs to the top-level key', () => {
        fs.writeFileSync(configPath, 'luker:\n  generationAckGraceMs: 30000\n');

        addMissingConfigValues(configPath);

        const config = yaml.parse(fs.readFileSync(configPath, 'utf8'));
        expect(config.generationAckGraceMs).toBe(30000);
        expect(config.luker?.generationAckGraceMs).toBeUndefined();
    });

    test('migrates the SILLYTAVERN_LUKER_ prefixed environment variable', () => {
        const releasedEnvKey = 'SILLYTAVERN_LUKER_GENERATIONACKGRACEMS';
        const migratedEnvKey = 'SILLYTAVERN_GENERATIONACKGRACEMS';
        delete process.env[migratedEnvKey];
        process.env[releasedEnvKey] = '30000';

        try {
            addMissingConfigValues(configPath);

            expect(process.env[migratedEnvKey]).toBe('30000');
            expect(process.env[releasedEnvKey]).toBeUndefined();
        } finally {
            delete process.env[releasedEnvKey];
            delete process.env[migratedEnvKey];
        }
    });
});
