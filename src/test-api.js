/**
 * Simple test script to check attribute group API endpoints
 * Run with: node test-api.js
 */

const axios = require('axios');

const API_BASE_URL = 'http://127.0.0.1:8000/api/v1';
const ATTRIBUTE_GROUPS_ENDPOINT = `${API_BASE_URL}/products/attributes/groups/`;

// Test data for creating a new attribute group
const newAttributeGroup = {
  name: 'Test Group',
  display_order: 100,
  is_active: true
};

let createdGroupId = null;

// 1. Test GET all attribute groups
async function testGetAllGroups() {
  try {
    console.log('Testing GET all attribute groups...');
    const response = await axios.get(ATTRIBUTE_GROUPS_ENDPOINT);
    console.log('Success! Found', response.data.count || response.data.length, 'attribute groups');
    console.log('Response structure:', JSON.stringify(response.data, null, 2).substring(0, 300) + '...');
    return true;
  } catch (error) {
    console.error('Error fetching attribute groups:', error.response?.data || error.message);
    return false;
  }
}

// 2. Test POST (create) attribute group
async function testCreateGroup() {
  try {
    console.log('\nTesting POST (create) attribute group...');
    const response = await axios.post(ATTRIBUTE_GROUPS_ENDPOINT, newAttributeGroup);
    createdGroupId = response.data.id;
    console.log('Success! Created attribute group with ID:', createdGroupId);
    console.log('Created group data:', response.data);
    return true;
  } catch (error) {
    console.error('Error creating attribute group:', error.response?.data || error.message);
    return false;
  }
}

// 3. Test GET single attribute group
async function testGetSingleGroup(id) {
  try {
    console.log(`\nTesting GET single attribute group (ID: ${id})...`);
    const response = await axios.get(`${ATTRIBUTE_GROUPS_ENDPOINT}${id}/`);
    console.log('Success! Retrieved attribute group:', response.data);
    return true;
  } catch (error) {
    console.error(`Error fetching attribute group with ID ${id}:`, error.response?.data || error.message);
    return false;
  }
}

// 4. Test PATCH (update) attribute group
async function testUpdateGroup(id) {
  try {
    console.log(`\nTesting PATCH (update) attribute group (ID: ${id})...`);
    const updateData = {
      name: 'Updated Test Group',
      is_active: false
    };
    const response = await axios.patch(`${ATTRIBUTE_GROUPS_ENDPOINT}${id}/`, updateData);
    console.log('Success! Updated attribute group:', response.data);
    return true;
  } catch (error) {
    console.error(`Error updating attribute group with ID ${id}:`, error.response?.data || error.message);
    return false;
  }
}

// 5. Test DELETE attribute group
async function testDeleteGroup(id) {
  try {
    console.log(`\nTesting DELETE attribute group (ID: ${id})...`);
    const response = await axios.delete(`${ATTRIBUTE_GROUPS_ENDPOINT}${id}/`);
    console.log('Success! Deleted attribute group with ID:', id);
    return true;
  } catch (error) {
    console.error(`Error deleting attribute group with ID ${id}:`, error.response?.data || error.message);
    return false;
  }
}

// Run all tests
async function runTests() {
  console.log('=== ATTRIBUTE GROUP API TESTS ===');
  
  // Test GET all
  const getAllSuccess = await testGetAllGroups();
  
  // Test POST (create)
  const createSuccess = await testCreateGroup();
  
  if (createSuccess && createdGroupId) {
    // Test GET single
    await testGetSingleGroup(createdGroupId);
    
    // Test PATCH (update)
    await testUpdateGroup(createdGroupId);
    
    // Test DELETE
    await testDeleteGroup(createdGroupId);
    
    // Verify deletion
    console.log('\nVerifying deletion...');
    await testGetSingleGroup(createdGroupId);
  }
  
  console.log('\n=== TEST SUMMARY ===');
  console.log('GET all attribute groups:', getAllSuccess ? 'PASSED' : 'FAILED');
  console.log('POST (create) attribute group:', createSuccess ? 'PASSED' : 'FAILED');
  
  if (!getAllSuccess || !createSuccess) {
    console.log('\nPossible issues:');
    console.log('1. Backend server not running at http://127.0.0.1:8000');
    console.log('2. API endpoint path is incorrect');
    console.log('3. Authentication required but not provided');
    console.log('4. CORS issues (if running from browser)');
    console.log('5. Backend server error - check Django logs');
  }
}

// Execute tests
runTests();
