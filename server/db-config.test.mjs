import { describe, expect, it } from 'vitest';
import { hasDatabaseConfig, mysqlOptionsFromEnv, mysqlOptionsFromParts, mysqlOptionsFromUrl, REQUIRED_TLS } from './db-config.mjs';

const tlsQuery = encodeURIComponent(JSON.stringify(REQUIRED_TLS));
const parts = {
  DB_HOST: 'gateway01.us-west-2.prod.aws.tidbcloud.com',
  DB_PORT: '4000',
  DB_USER: 'abc123.root',
  DB_PASSWORD: 'p@ss:w/rd#%?&= ',
  DB_NAME: 'stillpoint',
};

describe('database configuration', () => {
  it('returns null when nothing is configured', () => {
    expect(hasDatabaseConfig({})).toBe(false);
    expect(mysqlOptionsFromEnv({})).toBeNull();
    expect(mysqlOptionsFromEnv({ DATABASE_URL: '   ', DB_HOST: '' })).toBeNull();
  });

  it('reads separate DB_* variables with the raw password and required TLS', () => {
    const options = mysqlOptionsFromEnv(parts);
    expect(options).toMatchObject({
      host: 'gateway01.us-west-2.prod.aws.tidbcloud.com',
      port: 4000,
      user: 'abc123.root',
      password: 'p@ss:w/rd#%?&= ',
      database: 'stillpoint',
      timezone: 'Z',
    });
    expect(options.ssl).toEqual({ minVersion: 'TLSv1.2', rejectUnauthorized: true });
    expect(options.ssl).not.toHaveProperty('ca');
  });

  it('defaults DB_PORT to 3306 and rejects an invalid port', () => {
    const { DB_PORT: _port, ...withoutPort } = parts;
    void _port;
    expect(mysqlOptionsFromParts(withoutPort).port).toBe(3306);
    expect(() => mysqlOptionsFromParts({ ...parts, DB_PORT: 'abc' })).toThrow(/port/);
    expect(() => mysqlOptionsFromParts({ ...parts, DB_PORT: '70000' })).toThrow(/port/);
  });

  it('throws when the separate variables are incomplete, naming what is missing', () => {
    expect(hasDatabaseConfig({ DB_HOST: 'db.example.com' })).toBe(true);
    expect(() => mysqlOptionsFromEnv({ DB_HOST: 'db.example.com', DB_USER: 'u' })).toThrow(/DB_PASSWORD, DB_NAME/);
  });

  it('prefers DATABASE_URL when both forms are set', () => {
    const url = `mysql://urluser:url%40pass@url.example.com:4001/urldb?ssl=${tlsQuery}`;
    const options = mysqlOptionsFromEnv({ ...parts, DATABASE_URL: url });
    expect(options).toMatchObject({ host: 'url.example.com', port: 4001, user: 'urluser', password: 'url@pass', database: 'urldb' });
    expect(options.ssl).toEqual(REQUIRED_TLS);
  });

  it('keeps DATABASE_URL validation', () => {
    expect(() => mysqlOptionsFromUrl('postgres://u:p@h/db')).toThrow(/MySQL URL/);
    expect(() => mysqlOptionsFromUrl('mysql://u:p@h/db')).toThrow(/TLS settings/);
    expect(() => mysqlOptionsFromUrl('mysql://u:p@h/db?ssl=nope')).toThrow(/invalid/);
    expect(mysqlOptionsFromUrl(`mysql://u:p@h/db?ssl=${tlsQuery}`).port).toBe(3306);
  });
});
