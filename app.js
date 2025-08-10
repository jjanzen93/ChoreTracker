document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const balanceDisplay = document.getElementById('balance-display');
    
    const addChoreForm = document.getElementById('add-chore-form');
    const choreNameInput = document.getElementById('chore-name-input');
    const chorePointsInput = document.getElementById('chore-points-input');
    const choreList = document.getElementById('chore-list');
    const choreSort = document.getElementById('chore-sort');

    const addRewardForm = document.getElementById('add-reward-form');
    const rewardNameInput = document.getElementById('reward-name-input');
    const rewardCostInput = document.getElementById('reward-cost-input');
    const rewardList = document.getElementById('reward-list');
    const rewardSort = document.getElementById('reward-sort');

    const todayList = document.getElementById('today-list');

    // Modal elements
    const settingsBtn = document.getElementById('settings-btn');
    const settingsModal = document.getElementById('settings-modal');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const transactionList = document.getElementById('transaction-list');
    const downloadBtn = document.getElementById('download-data-btn');
    const uploadInput = document.getElementById('upload-data-input');
    const darkModeToggle = document.getElementById('dark-mode-toggle');

    // Application State
    let state = {
        balance: 0,
        chores: [],
        rewards: [],
        transactions: [],
        lastResetDate: new Date().toLocaleDateString(),
        choreSortOrder: 'value-asc',
        rewardSortOrder: 'value-desc',
        isDarkMode: false,
    };

    // Daily Reset Logic
    const checkAndResetDaily = () => {
        const today = new Date().toLocaleDateString();
        if (today !== state.lastResetDate) {
            // Filter out yesterday's chore completions from transactions
            state.transactions = state.transactions.filter(tx => {
                const txDate = new Date(tx.id).toLocaleDateString();
                // Keep all debits (rewards) and any credits that are not from yesterday
                return tx.type === 'debit' || txDate === today;
            });
            state.lastResetDate = today;
            render();
        }
    };

    // State Management
    const saveState = () => {
        const stateToSave = JSON.parse(JSON.stringify(state));
        stateToSave.chores.forEach(c => delete c.isEditing);
        stateToSave.rewards.forEach(r => delete r.isEditing);
        localStorage.setItem('choreTrackerState', JSON.stringify(stateToSave));
    };

    const loadState = () => {
        const savedState = localStorage.getItem('choreTrackerState');
        if (savedState) {
            const loaded = JSON.parse(savedState);
            state = {...state, ...loaded};
        }
    };

    // Rendering
    const render = () => {
        // Update theme
        document.body.classList.toggle('dark-mode', state.isDarkMode);
        darkModeToggle.checked = state.isDarkMode;

        balanceDisplay.textContent = state.balance;
        choreSort.value = state.choreSortOrder;
        rewardSort.value = state.rewardSortOrder;

        // Sort and Render Chores
        let sortedChores = [...state.chores];
        switch (state.choreSortOrder) {
            case 'value-asc': sortedChores.sort((a, b) => a.points - b.points); break;
            case 'value-desc': sortedChores.sort((a, b) => b.points - a.points); break;
            case 'alpha': sortedChores.sort((a, b) => a.name.localeCompare(b.name)); break;
        }
        
        choreList.innerHTML = '';
        sortedChores.forEach(chore => {
            const li = document.createElement('li');
            if (chore.isEditing) {
                li.innerHTML = `
                    <div class="edit-form">
                        <input type="text" class="edit-name-input" value="${chore.name}">
                        <input type="number" class="edit-points-input" value="${chore.points}" min="1">
                    </div>
                    <div class="item-actions">
                        <button data-id="${chore.id}" class="save-btn">Save</button>
                        <button data-id="${chore.id}" class="cancel-btn">Cancel</button>
                        <button data-id="${chore.id}" class="delete-btn">Delete</button>
                    </div>`;
            } else {
                li.innerHTML = `
                    <span class="item-info">${chore.name} <span class="item-points">(+${chore.points})</span></span>
                    <div class="item-actions">
                        <button data-id="${chore.id}" class="edit-btn">Edit</button>
                        <button data-id="${chore.id}" class="complete-chore-btn">Complete</button>
                    </div>`;
            }
            choreList.appendChild(li);
        });

        // Render Today's Accomplishments
        todayList.innerHTML = '';
        const todayString = new Date().toLocaleDateString();
        const todaysChores = state.transactions.filter(tx => tx.type === 'credit' && new Date(tx.id).toLocaleDateString() === todayString);
        
        if (todaysChores.length === 0) {
            todayList.innerHTML = '<li>No chores completed today.</li>';
        } else {
            todaysChores.forEach(tx => {
                const li = document.createElement('li');
                li.innerHTML = `<span class="item-info">${tx.description.replace('Completed: ', '')} <span class="item-points">(+${tx.amount})</span></span>`;
                todayList.appendChild(li);
            });
        }


        // Sort and Render Rewards
        let sortedRewards = [...state.rewards];
        switch (state.rewardSortOrder) {
            case 'value-desc': sortedRewards.sort((a, b) => b.cost - a.cost); break;
            case 'value-asc': sortedRewards.sort((a, b) => a.cost - b.cost); break;
            case 'alpha': sortedRewards.sort((a, b) => a.name.localeCompare(b.name)); break;
        }

        rewardList.innerHTML = '';
        sortedRewards.forEach(reward => {
            const li = document.createElement('li');
            if (reward.isEditing) {
                li.innerHTML = `
                    <div class="edit-form">
                        <input type="text" class="edit-name-input" value="${reward.name}">
                        <input type="number" class="edit-points-input" value="${reward.cost}" min="1">
                    </div>
                    <div class="item-actions">
                         <button data-id="${reward.id}" class="save-btn">Save</button>
                         <button data-id="${reward.id}" class="cancel-btn">Cancel</button>
                         <button data-id="${reward.id}" class="delete-btn">Delete</button>
                    </div>`;
            } else {
                li.innerHTML = `
                    <span class="item-info">${reward.name} <span class="item-points">(-${reward.cost})</span></span>
                    <div class="item-actions">
                        <button data-id="${reward.id}" class="edit-btn">Edit</button>
                        <button data-id="${reward.id}" class="redeem-reward-btn">Redeem</button>
                    </div>`;
            }
            rewardList.appendChild(li);
        });

        // Render Transactions
        transactionList.innerHTML = '';
        state.transactions.slice().reverse().forEach(tx => {
            const li = document.createElement('li');
            const sign = tx.type === 'credit' ? '+' : '-';
            const amountClass = tx.type;
            const timestamp = new Date(tx.id).toLocaleString();
            li.innerHTML = `
                <div class="transaction-main">
                    <span>${tx.description}</span>
                    <small>${timestamp}</small>
                </div>
                <div class="transaction-actions">
                    <span class="${amountClass}">(${sign}${tx.amount})</span>
                    <button data-id="${tx.id}" class="undo-tx-btn">Undo</button>
                </div>`;
            transactionList.appendChild(li);
        });
        
        saveState();
    };

    // Event Handlers
    addChoreForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = choreNameInput.value.trim();
        const points = parseInt(chorePointsInput.value);
        if (name && points > 0) {
            state.chores.push({ id: Date.now(), name, points });
            addChoreForm.reset();
            render();
        }
    });

    addRewardForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = rewardNameInput.value.trim();
        const cost = parseInt(rewardCostInput.value);
        if (name && cost > 0) {
            state.rewards.push({ id: Date.now(), name, cost });
            addRewardForm.reset();
            render();
        }
    });

    choreList.addEventListener('click', (e) => {
        const id = parseInt(e.target.dataset.id);
        const choreIndex = state.chores.findIndex(c => c.id === id);
        if (choreIndex === -1) return;

        const chore = state.chores[choreIndex];

        if (e.target.classList.contains('complete-chore-btn')) {
            state.balance += chore.points;
            state.transactions.push({ id: Date.now(), description: `Completed: ${chore.name}`, amount: chore.points, type: 'credit' });
        } else if (e.target.classList.contains('edit-btn')) {
            state.chores.forEach(c => c.isEditing = false);
            chore.isEditing = true;
        } else if (e.target.classList.contains('cancel-btn')) {
            chore.isEditing = false;
        } else if (e.target.classList.contains('save-btn')) {
            const li = e.target.closest('li');
            const newName = li.querySelector('.edit-name-input').value.trim();
            const newPoints = parseInt(li.querySelector('.edit-points-input').value);
            if (newName && newPoints > 0) {
                chore.name = newName;
                chore.points = newPoints;
                chore.isEditing = false;
            } else {
                alert('Please provide a valid name and point value.');
            }
        } else if (e.target.classList.contains('delete-btn')) {
            state.chores.splice(choreIndex, 1);
        }
        render();
    });

    rewardList.addEventListener('click', (e) => {
        const id = parseInt(e.target.dataset.id);
        const rewardIndex = state.rewards.findIndex(r => r.id === id);
        if (rewardIndex === -1) return;

        const reward = state.rewards[rewardIndex];

        if (e.target.classList.contains('redeem-reward-btn')) {
            if (state.balance >= reward.cost) {
                state.balance -= reward.cost;
                state.transactions.push({ id: Date.now(), description: `Redeemed: ${reward.name}`, amount: reward.cost, type: 'debit' });
            } else {
                alert("You don't have enough points!");
            }
        } else if (e.target.classList.contains('edit-btn')) {
            state.rewards.forEach(r => r.isEditing = false);
            reward.isEditing = true;
        } else if (e.target.classList.contains('cancel-btn')) {
            reward.isEditing = false;
        } else if (e.target.classList.contains('save-btn')) {
            const li = e.target.closest('li');
            const newName = li.querySelector('.edit-name-input').value.trim();
            const newCost = parseInt(li.querySelector('.edit-points-input').value);
            if (newName && newCost > 0) {
                reward.name = newName;
                reward.cost = newCost;
                reward.isEditing = false;
            } else {
                alert('Please provide a valid name and cost.');
            }
        } else if (e.target.classList.contains('delete-btn')) {
            state.rewards.splice(rewardIndex, 1);
        }
        render();
    });
    
    transactionList.addEventListener('click', (e) => {
        if (e.target.classList.contains('undo-tx-btn')) {
            const txId = parseInt(e.target.dataset.id);
            const txIndex = state.transactions.findIndex(tx => tx.id === txId);
            if (txIndex > -1) {
                const [tx] = state.transactions.splice(txIndex, 1);
                if (tx.type === 'credit') state.balance -= tx.amount;
                else state.balance += tx.amount;
                render();
            }
        }
    });

    choreSort.addEventListener('change', (e) => {
        state.choreSortOrder = e.target.value;
        render();
    });

    rewardSort.addEventListener('change', (e) => {
        state.rewardSortOrder = e.target.value;
        render();
    });

    darkModeToggle.addEventListener('change', () => {
        state.isDarkMode = darkModeToggle.checked;
        render();
    });

    downloadBtn.addEventListener('click', () => {
        const stateToSave = JSON.parse(JSON.stringify(state));
        stateToSave.chores.forEach(c => delete c.isEditing);
        stateToSave.rewards.forEach(r => delete r.isEditing);
        
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(stateToSave, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", "chore-tracker-data.json");
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    });

    uploadInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const newState = JSON.parse(event.target.result);
                if ('balance' in newState && 'chores' in newState && 'rewards' in newState && 'transactions' in newState) {
                    state = {...state, ...newState};
                    render();
                    alert('Data loaded successfully!');
                } else {
                    alert('Invalid file format.');
                }
            } catch (error) {
                alert('Error reading or parsing the file.');
                console.error(error);
            }
        };
        reader.readAsText(file);
        uploadInput.value = '';
    });

    // Modal event listeners
    settingsBtn.addEventListener('click', () => {
        settingsModal.classList.remove('hidden');
    });

    closeModalBtn.addEventListener('click', () => {
        settingsModal.classList.add('hidden');
    });

    settingsModal.addEventListener('click', (e) => {
        if (e.target === settingsModal) {
            settingsModal.classList.add('hidden');
        }
    });

    // Initial Load
    loadState();
    checkAndResetDaily(); // Check if a new day has started
    render();

    // Set an interval to check for the new day
    setInterval(checkAndResetDaily, 60000); // Check every minute
});
