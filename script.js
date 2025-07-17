document.addEventListener('DOMContentLoaded', function () {

    const themeSwitcher = document.getElementById('theme-switcher');
    const moonIcon = themeSwitcher.querySelector('.fa-moon');
    const sunIcon = themeSwitcher.querySelector('.fa-sun');

    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const savedTheme = localStorage.getItem('theme');
    const currentTheme = savedTheme || (prefersDark ? 'dark' : 'light');

    applyTheme(currentTheme);

    themeSwitcher.addEventListener('click', () => {
        const isDark = document.body.classList.contains('dark-mode');
        const newTheme = isDark ? 'light' : 'dark';
        applyTheme(newTheme);
        localStorage.setItem('theme', newTheme);
        showNotification(`${newTheme.charAt(0).toUpperCase() + newTheme.slice(1)} mode enabled`, 'info');
    });

    function applyTheme(theme) {
        if (theme === 'dark') {
            document.body.classList.add('dark-mode');
            moonIcon.style.display = 'none';
            sunIcon.style.display = 'inline';
        } else {
            document.body.classList.remove('dark-mode');
            moonIcon.style.display = 'inline';
            sunIcon.style.display = 'none';
        }
    }

  
    let tasks = JSON.parse(localStorage.getItem('tasks')) || [];

    function saveTasks() {
        localStorage.setItem('tasks', JSON.stringify(tasks));
    }

    function updateTaskStats() {
        document.getElementById('total-tasks').textContent = tasks.length;
        document.getElementById('completed-tasks').textContent = tasks.filter(t => t.completed).length;
        document.getElementById('pending-tasks').textContent = tasks.filter(t => !t.completed).length;
    }

    function renderTasks(filter = 'all') {
        const taskList = document.getElementById('task-list');
        const bell = document.getElementById('notification-bell');
        const badge = document.getElementById('notification-badge');
    
        const now = new Date();
        const overdueCount = tasks.filter(t => !t.completed && new Date(t.date) < now).length;

        if (overdueCount > 0) {
            badge.textContent = overdueCount;
            bell.classList.add('active');
        } else {
            badge.textContent = '0';
            bell.classList.remove('active');
        }
    
        taskList.innerHTML = '';

        let filteredTasks = tasks;
        if (filter === 'completed') {
            filteredTasks = tasks.filter(t => t.completed);
        } else if (filter === 'pending') {
            filteredTasks = tasks.filter(t => !t.completed);
        } else if (filter === 'urgent') {
            filteredTasks = tasks.filter(t => t.priority === 'high' && !t.completed);
        }

        filteredTasks.forEach(task => {
            const taskItem = document.createElement('div');
            taskItem.classList.add('task-item');
            if (task.completed) taskItem.classList.add('completed');
            if (task.priority === 'high') taskItem.classList.add('urgent');

            taskItem.innerHTML = `
                <div class="task-info">
                    <h4>${escapeHtml(task.title)}</h4>
                    <p>${escapeHtml(task.description || '')}</p>
                    <p><strong>Due:</strong> ${new Date(task.date).toLocaleString()}</p>
                    <p><strong>Priority:</strong> ${escapeHtml(task.priority)}</p>
                </div>
                <div class="task-actions">
                    <button class="edit-btn" data-id="${escapeHtml(task.id)}"><i class="fas fa-edit"></i></button>
                    <button class="complete-btn" data-id="${escapeHtml(task.id)}">
                        <i class="fas ${task.completed ? 'fa-undo' : 'fa-check-circle'}"></i>
                    </button>
                    <button class="delete-btn" data-id="${escapeHtml(task.id)}"><i class="fas fa-trash"></i></button>
                </div>
            `   ;
            taskList.appendChild(taskItem);
        });

    
        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                editTask(e.target.closest('button').dataset.id);
            });
        });

        document.querySelectorAll('.complete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                toggleTaskStatus(e.target.closest('button').dataset.id);
            });
        });

        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                deleteTask(e.target.closest('button').dataset.id);
            });
        });

        updateTaskStats();
        updateReminders();
    }

    function escapeHtml(unsafe) {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function addTask(task) {
        tasks.push(task);
        saveTasks();
        renderTasks();
        showNotification("Task added successfully!", 'success');
    }

    function deleteTask(id) {
        tasks = tasks.filter(t => t.id !== id);
        saveTasks();
        renderTasks();
        showNotification("Task deleted.", 'error');
    }

    function toggleTaskStatus(id) {
        const task = tasks.find(t => t.id === id);
        if (task) {
            task.completed = !task.completed;
            saveTasks();
            renderTasks();
            showNotification("Task status updated.", 'info');
        }
    }

    window.editTask = function (id) {
        const task = tasks.find(t => t.id === id);
        if (!task) return;

        document.getElementById('edit-id').value = task.id;
        document.getElementById('edit-title').value = task.title;
        document.getElementById('edit-description').value = task.description;
        document.getElementById('edit-date').value = task.date;
        document.getElementById('edit-priority').value = task.priority;
        document.getElementById('edit-completed').checked = task.completed;

        document.getElementById('edit-modal').style.display = 'block';
    };

    document.querySelector('.close-btn').addEventListener('click', () => {
        document.getElementById('edit-modal').style.display = 'none';
    });

    document.getElementById('edit-form').addEventListener('submit', function (e) {
        e.preventDefault();
        const id = document.getElementById('edit-id').value;
        const task = tasks.find(t => t.id === id);
        if (task) {
            task.title = document.getElementById('edit-title').value;
            task.description = document.getElementById('edit-description').value;
            task.date = document.getElementById('edit-date').value;
            task.priority = document.getElementById('edit-priority').value;
            task.completed = document.getElementById('edit-completed').checked;

            saveTasks();
            renderTasks();
            showNotification("Task updated!", 'success');
            document.getElementById('edit-modal').style.display = 'none';
        }
    });

   
    document.getElementById('task-form').addEventListener('submit', function (e) {
        e.preventDefault();
        
        const title = document.getElementById('task-title').value.trim();
        const description = document.getElementById('task-description').value.trim();
        const date = document.getElementById('task-date').value;
        const priority = document.getElementById('task-priority').value;

        
        if (!title) {
            showNotification("Please enter a task title", 'error');
            return;
        }

        if (!date) {
            showNotification("Please select a due date", 'error');
            return;
        }

        const task = {
            id: 'task-' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
            title,
            description,
            date,
            priority,
            completed: false,
            createdAt: new Date().toISOString()
        };

        addTask(task);
        this.reset();
        
        
        const now = new Date();
        const formattedNow = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
        document.getElementById('task-date').value = formattedNow;
    });

    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderTasks(btn.dataset.filter);
        });
    });

    document.getElementById('task-search').addEventListener('input', function () {
        const searchTerm = this.value.toLowerCase();
        const filtered = tasks.filter(task => task.title.toLowerCase().includes(searchTerm));
        const taskList = document.getElementById('task-list');
        taskList.innerHTML = '';
        filtered.forEach(task => {
            const taskItem = document.createElement('div');
            taskItem.classList.add('task-item');
            if (task.completed) taskItem.classList.add('completed');
            if (task.priority === 'high') taskItem.classList.add('urgent');
            taskItem.innerHTML = `
                <div class="task-info">
                    <h4>${task.title}</h4>
                    <p>${task.description || ''}</p>
                    <p><strong>Due:</strong> ${new Date(task.date).toLocaleString()}</p>
                    <p><strong>Priority:</strong> ${task.priority}</p>
                </div>
                <div class="task-actions">
                    <button onclick="editTask('${task.id}')"><i class="fas fa-edit"></i></button>
                    <button onclick="toggleTaskStatus('${task.id}')"><i class="fas fa-check-circle"></i></button>
                    <button onclick="deleteTask('${task.id}')"><i class="fas fa-trash"></i></button>
                </div>
            `;
            taskList.appendChild(taskItem);
        });
    });

    function updateReminders() {
        const reminderList = document.getElementById('reminder-list');
        reminderList.innerHTML = '';

        const now = new Date();
        const upcoming = tasks
            .filter(task => new Date(task.date) > now && !task.completed)
            .sort((a, b) => new Date(a.date) - new Date(b.date))
            .slice(0, 3);

        if (upcoming.length === 0) {
            reminderList.innerHTML = '<p>No upcoming deadlines</p>';
        } else {
            upcoming.forEach(task => {
                const reminder = document.createElement('div');
                reminder.classList.add('reminder');
                reminder.innerHTML = `
                    <h4>${task.title}</h4>
                    <p>Due: ${new Date(task.date).toLocaleString()}</p>
                `;
                reminderList.appendChild(reminder);
            });
        }
    }

    function showNotification(message, type = 'info') {
        const toast = document.getElementById('notification-toast');
        const icon = document.getElementById('toast-icon');
        const msg = document.getElementById('toast-message');

        msg.textContent = message;
        icon.className = 'fas';

        if (type === 'success') icon.classList.add('fa-check-circle');
        else if (type === 'error') icon.classList.add('fa-times-circle');
        else icon.classList.add('fa-info-circle');

        toast.classList.add('show');
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }

    renderTasks();

    const now = new Date();
    const formattedNow = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    document.getElementById('task-date').value = formattedNow;
});