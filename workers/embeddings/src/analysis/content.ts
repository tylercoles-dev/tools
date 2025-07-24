/**
 * Content analysis utilities
 */

import { createHash } from 'crypto';
import type { AnalysisEvent } from '../types.js';

export class ContentAnalyzer {
  private stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
    'by', 'from', 'up', 'about', 'into', 'through', 'during', 'before', 'after',
    'above', 'below', 'between', 'among', 'this', 'that', 'these', 'those', 'i',
    'me', 'we', 'you', 'he', 'she', 'it', 'they', 'them', 'his', 'her', 'its',
    'our', 'your', 'their', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should',
    'may', 'might', 'must', 'can', 'shall', 'am', 'not', 'no', 'yes'
  ]);

  private topicKeywords = {
    technology: ['programming', 'code', 'software', 'development', 'algorithm', 'database', 'api', 'framework', 'library', 'tech', 'computer', 'system', 'web', 'app', 'mobile', 'cloud', 'ai', 'ml', 'machine learning', 'artificial intelligence'],
    business: ['business', 'company', 'market', 'sales', 'revenue', 'profit', 'customer', 'client', 'strategy', 'growth', 'finance', 'investment', 'startup', 'enterprise', 'corporate', 'management', 'leadership', 'team', 'meeting', 'project'],
    research: ['research', 'study', 'analysis', 'data', 'experiment', 'hypothesis', 'theory', 'findings', 'results', 'methodology', 'academic', 'paper', 'publication', 'journal', 'science', 'scientific', 'investigation', 'observation'],
    personal: ['personal', 'family', 'friend', 'life', 'home', 'health', 'hobby', 'travel', 'food', 'music', 'movie', 'book', 'game', 'sport', 'exercise', 'vacation', 'weekend', 'birthday', 'celebration'],
    education: ['education', 'school', 'university', 'college', 'course', 'class', 'teacher', 'student', 'learn', 'study', 'exam', 'assignment', 'homework', 'lecture', 'tutorial', 'degree', 'certificate', 'knowledge']
  };

  private sentimentWords = {
    positive: new Set(['good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic', 'awesome', 'love', 'like', 'enjoy', 'happy', 'excited', 'pleased', 'satisfied', 'success', 'successful', 'win', 'won', 'achievement', 'accomplish', 'complete', 'finish', 'solve', 'fix', 'improve', 'better', 'best', 'perfect', 'outstanding', 'brilliant']),
    negative: new Set(['bad', 'terrible', 'awful', 'horrible', 'hate', 'dislike', 'sad', 'angry', 'frustrated', 'disappointed', 'fail', 'failed', 'failure', 'problem', 'issue', 'bug', 'error', 'mistake', 'wrong', 'broken', 'difficult', 'hard', 'impossible', 'worst', 'worse', 'ugly', 'slow', 'annoying']),
    intensifiers: new Set(['very', 'extremely', 'incredibly', 'really', 'quite', 'absolutely', 'completely', 'totally', 'definitely', 'certainly']),
    negators: new Set(['not', 'never', 'no', 'none', 'nothing', 'neither', 'nowhere', 'nobody'])
  };

  analyzeContent(content: string, memoryId: string, userId: string): AnalysisEvent {
    const contentHash = this.createContentHash(content);
    const words = this.tokenize(content);
    const wordCount = words.length;
    const characterCount = content.length;

    const keywords = this.extractKeywords(words);
    const topics = this.classifyTopics(content.toLowerCase());
    const entities = this.extractEntities(content);
    const sentimentScore = this.analyzeSentiment(words);
    const language = this.detectLanguage(content);

    return {
      memory_id: memoryId,
      user_id: userId,
      content_hash: contentHash,
      word_count: wordCount,
      character_count: characterCount,
      topics,
      entities,
      sentiment_score: sentimentScore,
      language,
      keywords,
      analysis_timestamp: Date.now(),
    };
  }

  private createContentHash(content: string): string {
    return createHash('sha256').update(content).digest('hex');
  }

  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 0);
  }

  private extractKeywords(words: string[]): string[] {
    const wordFreq = new Map<string, number>();
    
    // Count word frequencies, excluding stop words
    for (const word of words) {
      if (!this.stopWords.has(word) && word.length > 2) {
        wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
      }
    }

    // Sort by frequency and return top keywords
    return Array.from(wordFreq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word);
  }

  private classifyTopics(content: string): string[] {
    const topics: string[] = [];
    
    for (const [topic, keywords] of Object.entries(this.topicKeywords)) {
      const matchCount = keywords.filter(keyword => 
        content.includes(keyword.toLowerCase())
      ).length;
      
      // If at least 2 keywords match, consider it a topic
      if (matchCount >= 2) {
        topics.push(topic);
      }
    }

    return topics.length > 0 ? topics : ['general'];
  }

  private extractEntities(content: string): string[] {
    const entities: string[] = [];
    
    // Extract email addresses
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const emails = content.match(emailRegex) || [];
    entities.push(...emails);

    // Extract URLs
    const urlRegex = /https?:\/\/[^\s]+/g;
    const urls = content.match(urlRegex) || [];
    entities.push(...urls);

    // Extract potential proper nouns (capitalized words)
    const properNounRegex = /\b[A-Z][a-z]+\b/g;
    const properNouns = content.match(properNounRegex) || [];
    
    // Filter out common words that might be capitalized at sentence start
    const commonWords = new Set(['The', 'This', 'That', 'These', 'Those', 'A', 'An', 'I', 'We', 'You', 'He', 'She', 'It', 'They']);
    const filteredProperNouns = properNouns.filter(word => !commonWords.has(word));
    
    entities.push(...filteredProperNouns.slice(0, 10)); // Limit to 10 proper nouns

    return [...new Set(entities)]; // Remove duplicates
  }

  private analyzeSentiment(words: string[]): number {
    let score = 0;
    let intensity = 1;
    let negate = false;

    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      
      // Check for negation
      if (this.sentimentWords.negators.has(word)) {
        negate = true;
        continue;
      }

      // Check for intensifiers
      if (this.sentimentWords.intensifiers.has(word)) {
        intensity = 1.5;
        continue;
      }

      // Score positive/negative words
      if (this.sentimentWords.positive.has(word)) {
        score += negate ? -1 * intensity : 1 * intensity;
      } else if (this.sentimentWords.negative.has(word)) {
        score += negate ? 1 * intensity : -1 * intensity;
      }

      // Reset modifiers after applying them
      if (this.sentimentWords.positive.has(word) || this.sentimentWords.negative.has(word)) {
        negate = false;
        intensity = 1;
      }
    }

    // Normalize score to [-1, 1] range
    const maxScore = words.length * 1.5; // Maximum possible score
    return maxScore > 0 ? Math.max(-1, Math.min(1, score / maxScore)) : 0;
  }

  private detectLanguage(content: string): string {
    // Simple language detection based on common words
    const englishWords = new Set(['the', 'and', 'or', 'but', 'is', 'are', 'was', 'were', 'a', 'an', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by']);
    
    const words = this.tokenize(content);
    const englishWordCount = words.filter(word => englishWords.has(word)).length;
    const englishRatio = words.length > 0 ? englishWordCount / words.length : 0;

    // If more than 10% of words are common English words, consider it English
    return englishRatio > 0.1 ? 'en' : 'unknown';
  }
}