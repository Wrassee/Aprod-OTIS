// Debug script to check database and add questions
import { DatabaseStorage } from './server/storage.js';
import fs from 'fs';

const storage = new DatabaseStorage();

async function debugQuestions() {
  try {
    console.log('🔍 Checking templates...');
    const templates = await storage.getAllTemplates();
    console.log('Templates:', templates.map(t => ({ id: t.id, name: t.name, type: t.type, active: t.isActive })));
    
    console.log('\n🔍 Checking question configs...');
    for (const template of templates) {
      const questions = await storage.getQuestionConfigsByTemplate(template.id);
      console.log(`Template "${template.name}" has ${questions.length} questions`);
    }
    
    // Add a test question manually
    const activeTemplate = templates.find(t => t.isActive && t.type === 'questions');
    if (activeTemplate) {
      console.log(`\n➕ Adding test question to active template: ${activeTemplate.name}`);
      await storage.createQuestionConfig({
        templateId: activeTemplate.id,
        questionId: 'test-1',
        title: 'Test Question',
        type: 'text',
        required: true,
        cellReference: 'A1',
        sheetName: 'Sheet1',
        groupName: 'Test Group',
        groupOrder: 1
      });
      
      console.log('✅ Test question added');
      
      // Check again
      const questionsAfter = await storage.getQuestionConfigsByTemplate(activeTemplate.id);
      console.log(`Now has ${questionsAfter.length} questions`);
    }
    
  } catch (error) {
    console.error('❌ Debug error:', error);
  }
}

debugQuestions();