import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateWithGemini } from './gemini';

// Hoist mocks to ensure they are available in the factory
const mocks = vi.hoisted(() => {
  const mockGenerateContent = vi.fn();
  const mockGetGenerativeModel = vi.fn(() => ({
    generateContent: mockGenerateContent,
  }));
  
  return {
    mockGenerateContent,
    mockGetGenerativeModel,
  };
});

vi.mock('@google/generative-ai', () => {
  return {
    GoogleGenerativeAI: class {
      getGenerativeModel = mocks.mockGetGenerativeModel;
    },
  };
});

describe('gemini.js utility functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('generateWithGemini should parse JSON response correctly', async () => {
    // Mock the API response
    const mockResponseText = JSON.stringify({ result: 'success' });
    mocks.mockGenerateContent.mockResolvedValue({
      response: {
        text: () => mockResponseText,
      },
    });

    const result = await generateWithGemini('test prompt');
    
    expect(mocks.mockGetGenerativeModel).toHaveBeenCalledWith({ model: 'gemini-2.5-flash-lite' });
    expect(mocks.mockGenerateContent).toHaveBeenCalledWith('test prompt');
    expect(result).toEqual({ result: 'success' });
  });

  it('generateWithGemini should handle markdown code blocks', async () => {
    const mockResponseText = '```json\n{"result": "success"}\n```';
    mocks.mockGenerateContent.mockResolvedValue({
      response: {
        text: () => mockResponseText,
      },
    });

    const result = await generateWithGemini('test prompt');
    expect(result).toEqual({ result: 'success' });
  });

  it('generateWithGemini should throw error on API failure', async () => {
    mocks.mockGenerateContent.mockRejectedValue(new Error('API Error'));

    await expect(generateWithGemini('test prompt')).rejects.toThrow('Failed to generate content with Gemini: API Error');
  });
});
