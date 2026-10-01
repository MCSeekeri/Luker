import { describe, test, expect, jest, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

let util;

const SILLYTAVERN_ENV_KEY = 'SILLYTAVERN_DISABLEUPDATECHECK';
const LUKER_ENV_KEY = 'LUKER_DISABLEUPDATECHECK';
const scratchDir = fs.mkdtempSync(path.join(os.tmpdir(), 'luker-update-check-'));

function useConfigValue(value) {
    const configPath = path.join(scratchDir, `config-${value}.yaml`);
    fs.writeFileSync(configPath, `disableUpdateCheck: ${value}\n`);
    util.setConfigFilePath(configPath);
    util.reloadConfigCache();
}

beforeAll(async () => {
    util = await import('../src/util.js');
});

beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
    delete process.env[SILLYTAVERN_ENV_KEY];
    delete process.env[LUKER_ENV_KEY];
});

afterAll(() => {
    fs.rmSync(scratchDir, { recursive: true, force: true });
});

describe('disableUpdateCheck', () => {
    test('keeps the update check enabled by default', () => {
        useConfigValue(false);
        expect(util.isUpdateCheckDisabled()).toBe(false);
    });

    test('disables the update check when the config value is true', () => {
        useConfigValue(true);
        expect(util.isUpdateCheckDisabled()).toBe(true);
    });

    test('the SILLYTAVERN_ environment override takes precedence over the config file', () => {
        useConfigValue(false);
        process.env[SILLYTAVERN_ENV_KEY] = 'true';
        expect(util.isUpdateCheckDisabled()).toBe(true);

        useConfigValue(true);
        process.env[SILLYTAVERN_ENV_KEY] = 'false';
        expect(util.isUpdateCheckDisabled()).toBe(false);
    });

    test('the LUKER_ environment override takes precedence over SILLYTAVERN_ and the config file', () => {
        useConfigValue(false);
        process.env[LUKER_ENV_KEY] = 'true';
        expect(util.isUpdateCheckDisabled()).toBe(true);

        process.env[SILLYTAVERN_ENV_KEY] = 'false';
        expect(util.isUpdateCheckDisabled()).toBe(true);
    });

    test('checkRemoteVersion short-circuits to the disabled marker instead of a probe result', async () => {
        useConfigValue(true);

        await expect(util.checkRemoteVersion()).resolves.toEqual({ isLatest: true, updateCheckDisabled: true });
    });

    test('getVersion exposes the opt-out so clients skip the request', async () => {
        useConfigValue(true);
        await expect(util.getVersion()).resolves.toMatchObject({ updateCheckDisabled: true });

        useConfigValue(false);
        await expect(util.getVersion()).resolves.toMatchObject({ updateCheckDisabled: false });
    });
});
