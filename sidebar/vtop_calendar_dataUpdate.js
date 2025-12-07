// VTOP Calendar Data Update Handler
// Handles GitHub PR automation for VIT Academic Calendar updates

/*
GITHUB REPOSITORY STRUCTURE:
vit-academic-calendar/
├── README.md
├── calendars/
│   ├── Winter_Semester_2025-26/
│   │   ├── General_Semester.json
│   │   ├── General_Flexible.json
│   │   └── ...
│   ├── Fall_Semester_2025-26/
│   │   └── ...
│   └── ...
└── .github/
    └── workflows/
        └── validate-calendar.yml (optional)

SETUP INSTRUCTIONS:
1. Create a GitHub repository (e.g., "vit-academic-calendar")
2. Create a Personal Access Token:
   - Go to: https://github.com/settings/tokens/new
   - Select scopes: "repo" (full control of private repositories)
   - Copy the token (starts with ghp_)
3. In the extension, click "GitHub PR" and enter:
   - Repository Owner: divyanshupatel17 (default)
   - Repository Name: vit-academic-calendar (default)
   - GitHub Token: ghp_xxxxxxxxxxxx
4. The extension will automatically:
   - Check if the file exists and has changes
   - Create a new branch
   - Update the calendar file
   - Create a pull request with detailed changes
*/

(function() {
  'use strict';

  // GitHub PR Handler
  const GitHubPRHandler = {
    async getStoredConfig() {
      return new Promise((resolve) => {
        chrome.storage.local.get(['githubConfig'], (result) => {
          resolve(result.githubConfig || null);
        });
      });
    },

    async saveConfig(config) {
      return new Promise((resolve) => {
        chrome.storage.local.set({ githubConfig: config }, resolve);
      });
    },
    
    async clearMethod() {
      // Clear only the method, keep token and repo details
      return new Promise((resolve) => {
        chrome.storage.local.get(['githubConfig'], (result) => {
          if (result.githubConfig) {
            const config = result.githubConfig;
            delete config.method;
            chrome.storage.local.set({ githubConfig: config }, resolve);
          } else {
            resolve();
          }
        });
      });
    },

    async promptForConfig(existingConfig = null) {
      const isDark = document.body.classList.contains('dark-mode');
      const bgColor = isDark ? '#1a1a1a' : '#ffffff';
      const textColor = isDark ? '#e5e5e5' : '#1a1a1a';
      const borderColor = isDark ? '#404040' : '#e5e7eb';
      const inputBg = isDark ? '#2d2d2d' : '#ffffff';
      const labelColor = isDark ? '#d1d5db' : '#666666';
      const cardBg = isDark ? '#262626' : '#f9fafb';
      const warnBg = isDark ? '#78350f' : '#fef3c7';
      const warnBorder = isDark ? '#f59e0b' : '#f59e0b';
      const infoBg = isDark ? '#1e3a5f' : '#f0f9ff';
      const infoBorder = isDark ? '#2563eb' : '#3b82f6';
      
      const modal = document.createElement('div');
      modal.innerHTML = `
        <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 9999; display: flex; align-items: center; justify-content: center;">
          <div style="background: ${bgColor}; color: ${textColor}; padding: 24px; border-radius: 8px; max-width: 600px; width: 90%; max-height: 80vh; overflow-y: auto;">
            <h3 style="margin: 0 0 16px 0; color: ${textColor};">GitHub PR Setup</h3>
            <p style="margin-bottom: 16px; font-size: 14px; color: ${labelColor};">
              Choose how you want to contribute to the repository.
            </p>
            
            <label style="display: block; margin-bottom: 8px; font-weight: 500; color: ${textColor};">Repository Owner:</label>
            <input type="text" id="repoOwner" placeholder="username or organization" value="${existingConfig?.repoOwner || 'divyanshupatel17'}" style="width: 100%; padding: 8px; margin-bottom: 16px; border: 1px solid ${borderColor}; border-radius: 4px; background: ${inputBg}; color: ${textColor};">
            
            <label style="display: block; margin-bottom: 8px; font-weight: 500; color: ${textColor};">Repository Name:</label>
            <input type="text" id="repoName" placeholder="vit-academic-calendar" value="${existingConfig?.repoName || 'vit-academic-calendar'}" style="width: 100%; padding: 8px; margin-bottom: 16px; border: 1px solid ${borderColor}; border-radius: 4px; background: ${inputBg}; color: ${textColor};">
            
            <div style="border: 1px solid ${borderColor}; border-radius: 6px; padding: 12px; margin-bottom: 16px; background: ${cardBg};">
              <label style="display: flex; align-items: center; cursor: pointer; margin-bottom: 8px;">
                <input type="radio" name="prMethod" value="web" checked style="margin-right: 8px;">
                <span style="font-weight: 500; color: ${textColor};">Web-based PR (Recommended)</span>
              </label>
              <p style="margin: 0 0 0 24px; font-size: 12px; color: ${labelColor};">
                Opens GitHub in browser to create PR. No token needed. Works for everyone.
              </p>
            </div>
            
            <div style="border: 1px solid ${borderColor}; border-radius: 6px; padding: 12px; margin-bottom: 16px; background: ${cardBg};">
              <label style="display: flex; align-items: center; cursor: pointer; margin-bottom: 8px;">
                <input type="radio" name="prMethod" value="api" style="margin-right: 8px;">
                <span style="font-weight: 500; color: ${textColor};">API-based PR (Advanced)</span>
              </label>
              <p style="margin: 0 0 8px 24px; font-size: 12px; color: ${labelColor};">
                Automatic PR creation. Requires personal access token with 'repo' scope.
              </p>
              <div style="background: ${infoBg}; border-left: 3px solid ${infoBorder}; padding: 8px; margin: 8px 0 8px 24px; border-radius: 4px; font-size: 11px; color: ${textColor};">
                <strong>How it works:</strong> If you don't have write access, the extension will automatically fork the repository and create a PR from your fork.
              </div>
              <div id="tokenField" style="display: none; margin-left: 24px;">
                <input type="password" id="githubToken" placeholder="${existingConfig?.githubToken ? '••••••••••••••••' : 'ghp_xxxxxxxxxxxx'}" value="${existingConfig?.githubToken || ''}" style="width: 100%; padding: 8px; margin-bottom: 8px; border: 1px solid ${borderColor}; border-radius: 4px; background: ${inputBg}; color: ${textColor};">
                <div style="font-size: 11px; color: ${labelColor}; margin-bottom: 8px;">
                  <a href="https://github.com/settings/tokens/new?scopes=repo&description=VTOP+Calendar+Extension" target="_blank" style="color: #3b82f6;">Create token</a> - Select 'repo' scope
                </div>
                <details style="font-size: 11px; color: ${labelColor}; margin-top: 8px;">
                  <summary style="cursor: pointer; margin-bottom: 4px;">Required permissions</summary>
                  <ul style="margin: 4px 0; padding-left: 20px;">
                    <li>repo (Full control of private repositories)</li>
                  </ul>
                </details>
              </div>
            </div>
            
            <div style="display: flex; gap: 8px; justify-content: flex-end;">
              <button id="cancelBtn" style="padding: 8px 16px; border: 1px solid ${borderColor}; background: ${inputBg}; color: ${textColor}; border-radius: 4px; cursor: pointer;">Cancel</button>
              <button id="saveBtn" style="padding: 8px 16px; border: none; background: #3b82f6; color: white; border-radius: 4px; cursor: pointer;">Continue</button>
            </div>
          </div>
        </div>
      `;
      
      document.body.appendChild(modal);
      
      // Toggle token field visibility
      const radioButtons = modal.querySelectorAll('input[name="prMethod"]');
      const tokenField = modal.querySelector('#tokenField');
      radioButtons.forEach(radio => {
        radio.addEventListener('change', (e) => {
          tokenField.style.display = e.target.value === 'api' ? 'block' : 'none';
        });
      });
      
      return new Promise((resolve, reject) => {
        modal.querySelector('#cancelBtn').addEventListener('click', () => {
          document.body.removeChild(modal);
          reject(new Error('Cancelled'));
        });
        
        modal.querySelector('#saveBtn').addEventListener('click', () => {
          const repoOwner = modal.querySelector('#repoOwner').value.trim();
          const repoName = modal.querySelector('#repoName').value.trim();
          const method = modal.querySelector('input[name="prMethod"]:checked').value;
          const githubToken = method === 'api' ? modal.querySelector('#githubToken').value.trim() : null;
          
          if (!repoOwner || !repoName) {
            alert('Please fill in repository details');
            return;
          }
          
          if (method === 'api' && !githubToken) {
            alert('Please provide a GitHub token for API-based PR');
            return;
          }
          
          document.body.removeChild(modal);
          resolve({ repoOwner, repoName, githubToken, method });
        });
      });
    },

    createWebBasedPR(calendarData, filename, config) {
      const { repoOwner, repoName } = config;
      
      // Organize file path - keep original filename
      const semesterFolder = calendarData.semester.replace(/[^a-zA-Z0-9_-]/g, '_').replace(/_{2,}/g, '_');
      const filePath = `calendars/${semesterFolder}/${filename}.json`;
      
      // Prepare file content
      const fileContent = JSON.stringify(calendarData, null, 2);
      const encodedContent = encodeURIComponent(fileContent);
      
      // Generate PR details
      const monthsList = Object.keys(calendarData.months).join(', ');
      const totalEvents = Object.values(calendarData.months).reduce((sum, month) => {
        return sum + (month.events?.days?.length || 0);
      }, 0);
      
      const prTitle = `Update: ${calendarData.semester} - ${calendarData.classGroup}`;
      const prTitleEncoded = encodeURIComponent(prTitle);
      
      const prBody = `## VIT Academic Calendar Update

**Semester:** ${calendarData.semester}  
**Class Group:** ${calendarData.classGroup}  
**Last Updated:** ${calendarData.lastUpdated}  
**Total Event Days:** ${totalEvents}

### Months Included
${monthsList}

### File Location
\`${filePath}\`

### Instructions
1. Fork this repository if you haven't already
2. Create a new file at \`${filePath}\`
3. Copy the JSON content from the downloaded file
4. Commit and create a pull request

---
*Generated by VTOP Calendar Extension*  
*Please review the changes before submitting*`;
      
      const prBodyEncoded = encodeURIComponent(prBody);
      
      // Download the file first
      const blob = new Blob([fileContent], {type: 'application/json'});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename}.json`;
      a.click();
      URL.revokeObjectURL(url);
      
      // Open GitHub with pre-filled PR details
      // Users will need to: 1) Fork repo, 2) Upload file, 3) Create PR
      const githubUrl = `https://github.com/${repoOwner}/${repoName}/compare?expand=1&title=${prTitleEncoded}&body=${prBodyEncoded}`;
      
      // Show instructions
      setTimeout(() => {
        const isDark = document.body.classList.contains('dark-mode');
        const bgColor = isDark ? '#1a1a1a' : '#ffffff';
        const textColor = isDark ? '#e5e5e5' : '#1a1a1a';
        const borderColor = isDark ? '#404040' : '#e5e7eb';
        const inputBg = isDark ? '#2d2d2d' : '#ffffff';
        const labelColor = isDark ? '#9ca3af' : '#666666';
        const infoBg = isDark ? '#1e3a5f' : '#f0f9ff';
        const infoBorder = isDark ? '#2563eb' : '#3b82f6';
        const warnBg = isDark ? '#78350f' : '#fef3c7';
        const warnBorder = isDark ? '#f59e0b' : '#f59e0b';
        const codeBg = isDark ? '#374151' : '#f3f4f6';
        
        const instructionModal = document.createElement('div');
        instructionModal.innerHTML = `
          <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 9999; display: flex; align-items: center; justify-content: center;">
            <div style="background: ${bgColor}; color: ${textColor}; padding: 24px; border-radius: 8px; max-width: 700px; width: 90%; max-height: 80vh; overflow-y: auto;">
              <h3 style="margin: 0 0 16px 0; color: ${textColor};">How to Create Your PR</h3>
              
              <div style="background: ${infoBg}; border-left: 4px solid ${infoBorder}; padding: 12px; margin-bottom: 16px; border-radius: 4px;">
                <p style="margin: 0; font-size: 14px; color: ${textColor};">
                  File downloaded: <code style="background: ${codeBg}; padding: 2px 6px; border-radius: 3px;">${filename}.json</code>
                </p>
              </div>
              
              <div style="background: ${inputBg}; border: 1px solid ${borderColor}; border-radius: 6px; padding: 16px; margin-bottom: 16px;">
                <h4 style="margin: 0 0 8px 0; font-size: 14px; color: ${textColor};">PR Title:</h4>
                <div style="background: ${codeBg}; padding: 8px; border-radius: 4px; font-size: 13px; font-family: monospace; color: ${textColor}; word-break: break-word;">
                  ${prTitle}
                </div>
              </div>
              
              <div style="background: ${inputBg}; border: 1px solid ${borderColor}; border-radius: 6px; padding: 16px; margin-bottom: 16px;">
                <h4 style="margin: 0 0 8px 0; font-size: 14px; color: ${textColor};">PR Description:</h4>
                <div style="background: ${codeBg}; padding: 8px; border-radius: 4px; font-size: 12px; font-family: monospace; color: ${textColor}; max-height: 150px; overflow-y: auto; white-space: pre-wrap; word-break: break-word;">
${prBody}</div>
              </div>
              
              <h4 style="margin: 16px 0 8px 0; color: ${textColor};">Step-by-Step Guide:</h4>
              <ol style="font-size: 14px; line-height: 1.8; padding-left: 20px; color: ${textColor};">
                <li><strong>Fork the repository</strong> (if you haven't already)
                  <br><span style="color: ${labelColor}; font-size: 12px;">Click "Fork" on the repository page</span>
                </li>
                <li><strong>Navigate to your fork</strong>
                  <br><span style="color: ${labelColor}; font-size: 12px;">Go to: github.com/YOUR-USERNAME/${repoName}</span>
                </li>
                <li><strong>Create the folder structure</strong>
                  <br><span style="color: ${labelColor}; font-size: 12px;">Navigate to: <code style="background: ${codeBg}; padding: 2px 4px; border-radius: 3px;">${filePath}</code></span>
                </li>
                <li><strong>Upload the downloaded JSON file</strong>
                  <br><span style="color: ${labelColor}; font-size: 12px;">Click "Add file" → "Upload files"</span>
                </li>
                <li><strong>Commit the changes</strong>
                  <br><span style="color: ${labelColor}; font-size: 12px;">Add a commit message and commit</span>
                </li>
                <li><strong>Create Pull Request</strong>
                  <br><span style="color: ${labelColor}; font-size: 12px;">Click "Contribute" → "Open pull request"</span>
                </li>
              </ol>
              
              <div style="background: ${warnBg}; border-left: 4px solid ${warnBorder}; padding: 12px; margin: 16px 0; border-radius: 4px;">
                <p style="margin: 0; font-size: 13px; color: ${textColor};">
                  <strong>Tip:</strong> The PR title and description will be pre-filled when you click "Open GitHub" below!
                </p>
              </div>
              
              <div style="display: flex; gap: 8px; justify-content: flex-end; margin-top: 20px;">
                <button id="closeBtn" style="padding: 8px 16px; border: 1px solid ${borderColor}; background: ${inputBg}; color: ${textColor}; border-radius: 4px; cursor: pointer;">Close</button>
                <button id="openGithubBtn" style="padding: 8px 16px; border: none; background: #3b82f6; color: white; border-radius: 4px; cursor: pointer;">Open GitHub</button>
              </div>
            </div>
          </div>
        `;
        
        document.body.appendChild(instructionModal);
        
        instructionModal.querySelector('#closeBtn').addEventListener('click', () => {
          document.body.removeChild(instructionModal);
        });
        
        instructionModal.querySelector('#openGithubBtn').addEventListener('click', () => {
          window.open(githubUrl, '_blank');
          document.body.removeChild(instructionModal);
        });
      }, 500);
      
      return {
        success: true,
        method: 'web',
        message: 'File downloaded. Follow the instructions to create your PR.'
      };
    },

    async createPullRequest(calendarData, filename, config) {
      // If web-based method, use simplified approach
      if (config.method === 'web') {
        return this.createWebBasedPR(calendarData, filename, config);
      }
      
      // API-based method with automatic forking
      try {
        const { repoOwner, repoName, githubToken } = config;
        
        // Step 1: Get authenticated user info
        const userResponse = await fetch('https://api.github.com/user', {
          headers: {
            'Authorization': `token ${githubToken}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        });
        
        if (!userResponse.ok) {
          throw new Error('Invalid GitHub token. Please check your token and try again.');
        }
        
        const userData = await userResponse.json();
        const currentUser = userData.login;
        
        // Step 2: Get the original repository
        const repoResponse = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}`, {
          headers: {
            'Authorization': `token ${githubToken}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        });
        
        if (!repoResponse.ok) {
          if (repoResponse.status === 404) {
            throw new Error(`Repository not found. Please check the repository owner and name.`);
          }
          throw new Error(`Failed to fetch repository: ${repoResponse.status}`);
        }
        
        const repoData = await repoResponse.json();
        const defaultBranch = repoData.default_branch;
        
        // Step 3: Check if user has write access or needs to fork
        let targetOwner = repoOwner;
        let needsFork = false;
        
        // Check if user already has a fork
        const forkCheckResponse = await fetch(`https://api.github.com/repos/${currentUser}/${repoName}`, {
          headers: {
            'Authorization': `token ${githubToken}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        });
        
        if (forkCheckResponse.ok) {
          // User already has a fork
          const forkData = await forkCheckResponse.json();
          if (forkData.fork && forkData.parent.full_name === `${repoOwner}/${repoName}`) {
            targetOwner = currentUser;
            needsFork = false;
          }
        } else if (currentUser !== repoOwner) {
          // User doesn't have a fork and isn't the owner, need to create fork
          needsFork = true;
        }
        
        // Step 4: Create fork if needed
        if (needsFork) {
          const forkResponse = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/forks`, {
            method: 'POST',
            headers: {
              'Authorization': `token ${githubToken}`,
              'Accept': 'application/vnd.github.v3+json'
            }
          });
          
          if (!forkResponse.ok) {
            throw new Error('Failed to create fork. Please try Web-based PR method.');
          }
          
          // Wait for fork to be ready
          await new Promise(resolve => setTimeout(resolve, 3000));
          targetOwner = currentUser;
        }
        
        // Step 2: Organize file path by semester - keep original filename
        const semesterFolder = calendarData.semester.replace(/[^a-zA-Z0-9_-]/g, '_').replace(/_{2,}/g, '_');
        const filePath = `calendars/${semesterFolder}/${filename}.json`;
        
        // Step 3: Check if file exists in original repo and compare content
        let existingContent = null;
        let fileSha = null;
        let hasChanges = true;
        
        try {
          const fileResponse = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/contents/${filePath}?ref=${defaultBranch}`, {
            headers: {
              'Authorization': `token ${githubToken}`,
              'Accept': 'application/vnd.github.v3+json'
            }
          });
          
          if (fileResponse.ok) {
            const fileData = await fileResponse.json();
            existingContent = JSON.parse(atob(fileData.content));
            
            // Compare content (excluding lastUpdated timestamps)
            const compareData = (a, b) => {
              const aCopy = JSON.parse(JSON.stringify(a));
              const bCopy = JSON.parse(JSON.stringify(b));
              delete aCopy.lastUpdated;
              delete aCopy.lastUpdatedISO;
              delete bCopy.lastUpdated;
              delete bCopy.lastUpdatedISO;
              return JSON.stringify(aCopy) === JSON.stringify(bCopy);
            };
            
            hasChanges = !compareData(existingContent, calendarData);
            
            if (!hasChanges) {
              return {
                success: false,
                error: 'No changes detected. The calendar data is already up to date.'
              };
            }
          }
        } catch (e) {
          // File doesn't exist, proceed with creation
          console.log('File does not exist, will create new');
        }
        
        // Check if file exists in fork/target repo to get SHA
        try {
          const forkFileResponse = await fetch(`https://api.github.com/repos/${targetOwner}/${repoName}/contents/${filePath}?ref=${defaultBranch}`, {
            headers: {
              'Authorization': `token ${githubToken}`,
              'Accept': 'application/vnd.github.v3+json'
            }
          });
          
          if (forkFileResponse.ok) {
            const forkFileData = await forkFileResponse.json();
            fileSha = forkFileData.sha;
          }
        } catch (e) {
          // File doesn't exist in fork
        }
        
        // Step 5: Get the latest commit SHA from target repository (fork or original)
        const refResponse = await fetch(`https://api.github.com/repos/${targetOwner}/${repoName}/git/refs/heads/${defaultBranch}`, {
          headers: {
            'Authorization': `token ${githubToken}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        });
        
        if (!refResponse.ok) {
          throw new Error(`Failed to get branch reference: ${refResponse.status}`);
        }
        
        const refData = await refResponse.json();
        
        if (!refData.object || !refData.object.sha) {
          throw new Error('Invalid response from GitHub API. Check your token permissions.');
        }
        
        const latestCommitSha = refData.object.sha;
        
        // Step 6: Create a new branch with unique name in target repository
        const timestamp = Date.now();
        const randomStr = Math.random().toString(36).substring(7);
        const branchName = `update-calendar-${timestamp}-${randomStr}`;
        
        const createBranchResponse = await fetch(`https://api.github.com/repos/${targetOwner}/${repoName}/git/refs`, {
          method: 'POST',
          headers: {
            'Authorization': `token ${githubToken}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            ref: `refs/heads/${branchName}`,
            sha: latestCommitSha
          })
        });
        
        if (!createBranchResponse.ok) {
          const errorData = await createBranchResponse.json();
          throw new Error(`Failed to create branch: ${errorData.message}`);
        }
        
        // Step 7: Create/Update file in the new branch (in fork or original repo)
        const content = btoa(unescape(encodeURIComponent(JSON.stringify(calendarData, null, 2))));
        
        const updatePayload = {
          message: `Update ${calendarData.semester} - ${calendarData.classGroup}`,
          content: content,
          branch: branchName
        };
        
        if (fileSha) {
          updatePayload.sha = fileSha;
        }
        
        const updateResponse = await fetch(`https://api.github.com/repos/${targetOwner}/${repoName}/contents/${filePath}`, {
          method: 'PUT',
          headers: {
            'Authorization': `token ${githubToken}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(updatePayload)
        });
        
        if (!updateResponse.ok) {
          const errorData = await updateResponse.json();
          throw new Error(`Failed to update file: ${errorData.message}`);
        }
        
        // Step 8: Generate detailed PR description
        const monthsList = Object.keys(calendarData.months).join(', ');
        const totalEvents = Object.values(calendarData.months).reduce((sum, month) => {
          return sum + (month.events?.days?.length || 0);
        }, 0);
        
        let changesSummary = '';
        if (existingContent) {
          changesSummary = '\n### Changes Summary\n';
          const oldMonths = Object.keys(existingContent.months || {});
          const newMonths = Object.keys(calendarData.months);
          
          const addedMonths = newMonths.filter(m => !oldMonths.includes(m));
          const removedMonths = oldMonths.filter(m => !newMonths.includes(m));
          const updatedMonths = newMonths.filter(m => oldMonths.includes(m));
          
          if (addedMonths.length) changesSummary += `- Added months: ${addedMonths.join(', ')}\n`;
          if (removedMonths.length) changesSummary += `- Removed months: ${removedMonths.join(', ')}\n`;
          if (updatedMonths.length) changesSummary += `- Updated months: ${updatedMonths.join(', ')}\n`;
        } else {
          changesSummary = '\n### New Calendar\n- This is a new calendar file\n';
        }
        
        const prBody = `## VIT Academic Calendar Update

**Semester:** ${calendarData.semester}  
**Class Group:** ${calendarData.classGroup}  
**Last Updated:** ${calendarData.lastUpdated}  
**Total Event Days:** ${totalEvents}

${changesSummary}

### Months Included
${monthsList}

### File Location
\`${filePath}\`

---
*Auto-generated by VTOP Calendar Extension*  
*Please review the changes before merging*`;

        // Step 9: Create Pull Request from fork to original repo
        const prTitle = existingContent 
          ? `Update: ${calendarData.semester} - ${calendarData.classGroup}`
          : `Add: ${calendarData.semester} - ${calendarData.classGroup}`;
        
        // If using fork, head should be user:branch
        const headBranch = targetOwner !== repoOwner ? `${targetOwner}:${branchName}` : branchName;
        
        const prResponse = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/pulls`, {
          method: 'POST',
          headers: {
            'Authorization': `token ${githubToken}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            title: prTitle,
            body: prBody,
            head: headBranch,
            base: defaultBranch
          })
        });
        
        if (!prResponse.ok) {
          const errorData = await prResponse.json();
          throw new Error(`Failed to create PR: ${errorData.message}`);
        }
        
        const prData = await prResponse.json();
        
        return {
          success: true,
          prUrl: prData.html_url,
          prNumber: prData.number,
          isUpdate: !!existingContent
        };
        
      } catch (error) {
        console.error('GitHub PR Error:', error);
        return {
          success: false,
          error: error.message
        };
      }
    }
  };

  // Export functions to global scope
  window.VTOPCalendarDataUpdate = {
    GitHubPRHandler
  };

})();
