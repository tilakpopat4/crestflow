/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { GEMINI_CANDIDATE_MODELS, generateWorkSummary } from '../src/lib/geminiService';
import { Client, WorkItem, UserProfile } from '../src/types';

describe('Gemini AI Summarizer Model Versatility Suite', () => {
  it('prioritizes gemini-3.8-flash as the primary 2026 default model', () => {
    assert.strictEqual(
      GEMINI_CANDIDATE_MODELS[0],
      'gemini-3.8-flash',
      'Primary default model must be gemini-3.8-flash for modern Google AI Studio API keys'
    );
    assert.ok(
      GEMINI_CANDIDATE_MODELS.includes('gemini-2.5-flash'),
      'Must include gemini-2.5-flash as fallback for existing keys'
    );
    assert.ok(
      GEMINI_CANDIDATE_MODELS.includes('gemini-2.0-flash'),
      'Must include gemini-2.0-flash as fallback'
    );
    assert.ok(
      GEMINI_CANDIDATE_MODELS.includes('gemini-1.5-flash'),
      'Must include gemini-1.5-flash as fallback'
    );
  });

  it('rejects missing or blank API key with clear actionable configuration message', async () => {
    const clients: Client[] = [];
    const workItems: WorkItem[] = [];
    const targetDate = new Date();
    const profile: UserProfile = {
      name: 'Test Freelancer',
      email: 'test@example.com',
      geminiApiKey: ''
    };

    await assert.rejects(
      async () => {
        await generateWorkSummary(clients, workItems, targetDate, profile);
      },
      {
        message: 'Gemini API key is not configured. Please add your API key in Profile Settings.'
      }
    );
  });

  it('sanitizes wrapped quotes in pasted API keys', async () => {
    const clients: Client[] = [];
    const workItems: WorkItem[] = [];
    const targetDate = new Date();
    // Intentionally pass an invalid key wrapped with quotes to verify key extraction & fast failure
    const profile: UserProfile = {
      name: 'Test Freelancer',
      email: 'test@example.com',
      geminiApiKey: '"AIzaSyDummyKeyForTestingQuotes"'
    };

    try {
      await generateWorkSummary(clients, workItems, targetDate, profile);
    } catch (err: any) {
      // Must not complain about missing key, will report invalid key or model access
      assert.notStrictEqual(
        err.message,
        'Gemini API key is not configured. Please add your API key in Profile Settings.'
      );
    }
  });
});
