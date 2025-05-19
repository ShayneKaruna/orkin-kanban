import React, { useState, useEffect } from 'react';
import { 
  Plus, X, Edit2, Calendar, Menu, LayoutGrid, 
  Users, Briefcase, Building2, ChevronDown, Filter, Search, Check,
  ListChecks, Wrench, Flame,
  FileDown, LayoutDashboard, AlertTriangle, LifeBuoy
} from 'lucide-react';
import jsPDF from 'jspdf';
import * as api from '../services/api';
import { io } from 'socket.io-client';

export default function KanbanBoard() {
  // Initial data based on your weekly updates
  const initialData = {
    columns: [
      { id: 'todo', title: 'To Do', color: 'bg-gradient-to-br from-emerald-900 via-emerald-800 to-gray-900' },
      { id: 'inprogress', title: 'In Progress', color: 'bg-gradient-to-br from-amber-900 via-amber-800 to-gray-900' },
      { id: 'done', title: 'Done', color: 'bg-gradient-to-br from-indigo-900 via-indigo-800 to-gray-900' }
    ],
    categories: [
      { id: 'projects', title: 'Projects' },
      { id: 'support', title: 'Support' },
      { id: 'executives', title: 'Executives' },
      { id: 'regionmanagers', title: 'Region Managers' },
      { id: 'branchmanagers', title: 'Branch Managers' }
    ],
    teamMembers: [
      { id: 'tm1', name: 'Shayne Karuna', color: 'bg-blue-500' },
      { id: 'tm2', name: 'Vansh Vansh', color: 'bg-green-500' },
      { id: 'tm3', name: 'Ethan Champagne', color: 'bg-purple-500' },
      { id: 'tm4', name: 'Shaurya Chaadak', color: 'bg-pink-500' }
    ],
    executives: [
      { id: 'e1', name: 'Rob Quinn', tasks: [], status: 'N/A' },
      { id: 'e2', name: 'Bruno Levesque', tasks: [], status: 'N/A' },
      { id: 'e3', name: 'Scot Henry', tasks: [], status: 'N/A' },
      { id: 'e4', name: 'Michelle Gazzellone', tasks: [], status: 'N/A' },
      { id: 'e5', name: 'Jamie Belitz', tasks: [], status: 'N/A' },
      { id: 'e6', name: 'Rina Altbaum', tasks: [], status: 'N/A' },
      { id: 'e7', name: 'Sean Rollo', tasks: [], status: 'N/A' }
    ],
    regionManagers: [
      { id: 'rm1', name: 'Ryan Wood', tasks: [], status: 'N/A' },
      { id: 'rm2', name: 'John Papailiadis', tasks: [], status: 'N/A' },
      { id: 'rm3', name: 'Martin Aube', tasks: [], status: 'N/A' },
      { id: 'rm4', name: 'Dale Kurt', tasks: [], status: 'N/A' },
      { id: 'rm5', name: 'Rob Caron', tasks: [], status: 'N/A' },
      { id: 'rm6', name: 'Sonia Lear', tasks: [], status: 'N/A' }
    ],
    branchManagers: [
      { id: 'bm1', name: 'John Doe', tasks: [], status: 'N/A' },
      { id: 'bm2', name: 'Jane Smith', tasks: [], status: 'N/A' }
    ],
    tasks: [],
    supportItems: [],
    burningIssues: [],
    branchManagerIssues: []
  };

  const fetchAllData = async () => {
    const [tasks, teamMembers, burningIssues, supportItems] = await Promise.all([
      api.getTasks(),
      api.getTeamMembers(),
      api.getBurningIssues(),
      api.getSupportItems()
    ]);
    console.log('Fetched teamMembers:', teamMembers);
    setData(prev => ({
      ...prev,
      tasks: tasks
        .filter(task => task && (task._id || task.id) && task.title)
        .map(task => ({ ...task, id: task._id || task.id })),
      teamMembers: teamMembers
        .filter(member => member && (member._id || member.id) && member.name)
        .map(member => ({ ...member, id: member._id || member.id })),
      burningIssues: burningIssues
        .filter(issue => issue && (issue._id || issue.id))
        .map(issue => ({ ...issue, id: issue._id || issue.id })),
      supportItems: supportItems
        .filter(item => item && (item._id || item.id))
        .map(item => ({ ...item, id: item._id || item.id })),
    }));
  };
  const [data, setData] = useState(initialData);

  // Add new state for offline mode and sync status
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [pendingChanges, setPendingChanges] = useState(() => {
    const saved = localStorage.getItem('pendingChanges');
    return saved ? JSON.parse(saved) : [];
  });
  const [isSyncing, setIsSyncing] = useState(false);

  // Fetch all data from backend on mount
  useEffect(() => {
    let isMounted = true;
    let pollInterval;
    let retryCount = 0;
    const maxRetries = 3;

    const fetchData = async () => {
      try {
        if (!isMounted) return;
        
        const [tasks, teamMembers, burningIssues, supportItems] = await Promise.all([
          api.getTasks().catch(err => {
            console.error('Error fetching tasks:', err);
            return [];
          }),
          api.getTeamMembers().catch(err => {
            console.error('Error fetching team members:', err);
            return [];
          }),
          api.getBurningIssues().catch(err => {
            console.error('Error fetching burning issues:', err);
            return [];
          }),
          api.getSupportItems().catch(err => {
            console.error('Error fetching support items:', err);
            return [];
          })
        ]);

        if (!isMounted) return;

        // Validate and process team members
        const validTeamMembers = teamMembers
          .filter(member => member && (member._id || member.id) && member.name)
          .map(member => ({ 
            ...member, 
            id: member._id || member.id,
            color: member.color || getRandomTeamMemberColor()
          }));

        // If no team members were fetched, use initial data
        const finalTeamMembers = validTeamMembers.length > 0 ? validTeamMembers : initialData.teamMembers;

        setData(prev => ({
          ...prev,
          tasks: tasks
            .filter(task => task && (task._id || task.id) && task.title)
            .map(task => ({ ...task, id: task._id || task.id })),
          teamMembers: finalTeamMembers,
          burningIssues: burningIssues
            .filter(issue => issue && (issue._id || issue.id))
            .map(issue => ({ ...issue, id: issue._id || issue.id })),
          supportItems: supportItems
            .filter(item => item && (item._id || item.id))
            .map(item => ({ ...item, id: item._id || item.id })),
        }));

        retryCount = 0; // Reset retry count on successful fetch
      } catch (error) {
        console.error('Error fetching data:', error);
        if (isMounted) {
          setError('Failed to fetch data. Please check your connection.');
          retryCount++;
          if (retryCount < maxRetries) {
            // Retry after a delay
            setTimeout(fetchData, 1000 * retryCount);
          }
        }
      }
    };

    // Initial fetch
    fetchData();

    // Set up polling with exponential backoff
    const startPolling = () => {
      pollInterval = setInterval(fetchData, 5000);
    };

    startPolling();

    return () => {
      isMounted = false;
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, []);

  // Socket.IO connection setup
  useEffect(() => {
    let socket;
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 5;
    const reconnectDelay = 1000;
    let isComponentMounted = true;
    let connectionTimeout;

    const connectSocket = () => {
      if (!isComponentMounted) return;

      // Clear any existing connection timeout
      if (connectionTimeout) {
        clearTimeout(connectionTimeout);
      }

      socket = io('http://localhost:5000', {
        reconnection: true,
        reconnectionAttempts: maxReconnectAttempts,
        reconnectionDelay: reconnectDelay,
        timeout: 10000,
        transports: ['websocket', 'polling'],
        forceNew: true,
        autoConnect: true
      });

      // Set a connection timeout
      connectionTimeout = setTimeout(() => {
        if (socket && !socket.connected) {
          console.log('Socket connection timeout, retrying...');
          socket.disconnect();
          socket.connect();
        }
      }, 5000);

      socket.on('connect', () => {
        if (!isComponentMounted) return;
        console.log('Socket connected:', socket.id);
        reconnectAttempts = 0;
        if (connectionTimeout) {
          clearTimeout(connectionTimeout);
        }
      });

      socket.on('connect_error', (error) => {
        if (!isComponentMounted) return;
        console.error('Socket connection error:', error);
        reconnectAttempts++;
        if (reconnectAttempts >= maxReconnectAttempts) {
          console.error('Max reconnection attempts reached');
          setError('Unable to establish real-time connection. Some features may be limited.');
        }
      });

      socket.on('disconnect', (reason) => {
        if (!isComponentMounted) return;
        console.log('Socket disconnected:', reason);
        if (reason === 'io server disconnect') {
          socket.connect();
        }
      });

      socket.on('error', (error) => {
        if (!isComponentMounted) return;
        console.error('Socket error:', error);
      });

      // Batch updates to prevent multiple re-renders
      const handleUpdate = () => {
        if (!isComponentMounted) return;
        fetchAllData();
      };

      socket.on('tasks-updated', handleUpdate);
      socket.on('team-members-updated', handleUpdate);
      socket.on('burning-issues-updated', handleUpdate);
      socket.on('support-items-updated', handleUpdate);
    };

    connectSocket();

    return () => {
      isComponentMounted = false;
      if (connectionTimeout) {
        clearTimeout(connectionTimeout);
      }
      if (socket) {
        console.log('Cleaning up socket connection');
        socket.removeAllListeners();
        socket.disconnect();
        socket.close();
      }
    };
  }, []);

  // Handle online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      syncWithBackend();
    };

    const handleOffline = () => {
      setIsOffline(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Function to sync pending changes with backend
  const syncWithBackend = async () => {
    if (isSyncing || pendingChanges.length === 0) return;

    setIsSyncing(true);
    const errors = [];

    for (const change of pendingChanges) {
      try {
        switch (change.type) {
          case 'create':
            await api.createTask(change.data);
            break;
          case 'update':
            await api.updateTask(change.data.id, change.data);
            break;
          case 'delete':
            await api.deleteTask(change.data.id);
            break;
        }
      } catch (error) {
        console.error(`Failed to sync change:`, error);
        errors.push(change);
      }
    }

    // Remove successfully synced changes and keep failed ones
    setPendingChanges(errors);
    setIsSyncing(false);

    // If there are still errors, show a notification
    if (errors.length > 0) {
      setError(`Failed to sync ${errors.length} changes. Will retry when connection is restored.`);
    }
  };

  const [selectedCategory, setSelectedCategory] = useState('all');
  const [editingTask, setEditingTask] = useState(null);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    status: 'todo',
    category: 'projects',
    assignee: '',
    for: '',
    dueDate: '',
    priority: 'medium'
  });
  const [showAddTask, setShowAddTask] = useState(false);
  const [activeTab, setActiveTab] = useState('board');
  const [searchTerm, setSearchTerm] = useState('');
  const [newTeamMember, setNewTeamMember] = useState('');
  const [showAddTeamMember, setShowAddTeamMember] = useState(false);
  const [selectedBoardMember, setSelectedBoardMember] = useState('all');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [darkMode, setDarkMode] = useState(true); // Default to dark mode
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
 
  
  // For burning issues
  const [newBurningIssue, setNewBurningIssue] = useState('');
  const [newSupportItem, setNewSupportItem] = useState('');
  
  const resetNewTask = () => {
    setNewTask({
      title: '',
      description: '',
      status: 'todo',
      category: 'projects',
      assignee: '',
      for: '',
      dueDate: '',
      priority: 'medium'
    });
  };

  const handleCloseAddTask = () => {
    setShowAddTask(false);
    resetNewTask();
  };
  
  // Get team member color
  const getTeamMemberColor = (name) => {
    const member = data.teamMembers.find(m => m.name === name);
    return member ? member.color : 'from-gray-500 to-gray-700';
  };

  // Get a random color for new team members
  const getRandomTeamMemberColor = () => {
    const colors = [
      'bg-blue-500',
      'bg-green-500',
      'bg-purple-500',
      'bg-pink-500',
      'bg-indigo-500',
      'bg-teal-500',
      'bg-orange-500',
      'bg-red-500'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  };
  
  // Filter tasks based on selected category, search term, AND selected board member
  const filteredTasks = data.tasks
    .filter(task => {
      if (selectedCategory === 'all') return true;
      if (selectedCategory === 'projects') return task.category === 'projects';
      return task.category === selectedCategory;
    })
    .filter(task => selectedBoardMember === 'all' || task.assignee === selectedBoardMember)
    .filter(task => {
      if (!searchTerm) return true;
      const searchLower = searchTerm.toLowerCase();
      return (
        task.title.toLowerCase().includes(searchLower) ||
        task.description.toLowerCase().includes(searchLower) ||
        task.assignee.toLowerCase().includes(searchLower)
      );
    });

  // Drag and drop functionality
  const [draggedTask, setDraggedTask] = useState(null);

  const handleDragStart = (task) => {
    setDraggedTask(task);
  };

  const handleDragOver = (e, columnId) => {
    e.preventDefault();
  };

  const handleDrop = async (e, columnId) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain');
    const task = data.tasks.find(t => t.id === taskId);
    
    if (task && task.status !== columnId) {
      // First update the UI immediately for better user experience
      const updatedTask = { ...task, status: columnId };
      setData(prevData => ({
        ...prevData,
        tasks: prevData.tasks.map(t => 
          t.id === taskId ? updatedTask : t
        )
      }));
      
      // Then try to save to the backend
      try {
        const serverUpdatedTask = await api.updateTask(taskId, updatedTask);
        
        // Update with the server response if successful
        setData(prevData => ({
          ...prevData,
          tasks: prevData.tasks.map(t => 
            t.id === taskId ? updatedTask : t
          )
        }));
      } catch (err) {
        console.error('Error updating task status:', err);
        setError('Failed to update task status. Please try again.');
      }
    }
  };

  // Task form handlers
  const handleAddTask = async () => {
    try {
      if (!newTask.title.trim()) {
        setError('Task title is required');
        return;
      }
      const createdTask = await api.createTask({
        ...newTask,
        createdAt: new Date().toISOString(),
      });
      setData(prevData => ({
        ...prevData,
        tasks: [
          ...prevData.tasks,
          { ...createdTask, id: createdTask._id || createdTask.id }
        ]
      }));
      resetNewTask();
      setShowAddTask(false);
      setError(null);
    } catch (err) {
      console.error('Error creating task:', err);
      setError('Failed to create task. Please try again.');
    }
  };

  const handleUpdateTask = async (updatedTask) => {
    try {
      // First update the UI and localStorage
      setData(prevData => {
        const newData = {
          ...prevData,
          tasks: prevData.tasks.map(task => 
            task.id === updatedTask.id ? updatedTask : task
          )
        };
        return newData;
      });
      
      // Add to pending changes if offline
      if (isOffline) {
        setPendingChanges(prev => [...prev, { type: 'update', data: updatedTask }]);
        setError('Task updated in offline mode. Will sync when connection is restored.');
      } else {
        // Try to update the backend
        try {
          await api.updateTask(updatedTask.id, updatedTask);
        } catch (apiError) {
          console.error('Error updating task in backend:', apiError);
          setPendingChanges(prev => [...prev, { type: 'update', data: updatedTask }]);
          setError('Failed to update task in server. Changes are saved locally.');
        }
      }
      
      setEditingTask(null);
    } catch (error) {
      console.error('Error updating task:', error);
      setError('Failed to update task. Please try again.');
    }
  };

  // Handle deleting a task
  const handleDeleteTask = async (taskId) => {
    try {
      // Update local state first for immediate feedback
      setData(prevData => ({
        ...prevData,
        tasks: prevData.tasks.filter(task => task.id !== taskId)
      }));

      // Try to sync with backend if online
      if (!isOffline) {
        try {
          await api.deleteTask(taskId);
        } catch (err) {
          console.error('Error syncing task deletion:', err);
          // Add to pending changes if sync fails
          setPendingChanges(prev => [...prev, {
            type: 'delete',
            id: taskId,
            endpoint: 'tasks'
          }]);
        }
      } else {
        // Add to pending changes if offline
        setPendingChanges(prev => [...prev, {
          type: 'delete',
          id: taskId,
          endpoint: 'tasks'
        }]);
      }
    } catch (err) {
      console.error('Error deleting task:', err);
      setError('Failed to delete task. Please try again.');
    }
  };
  
  // Handle adding a new team member
  const handleAddTeamMember = async (e) => {
    e.preventDefault();
    if (!newTeamMember.trim()) return;

    const tempId = `temp-${Date.now()}`;
    const newMember = {
      id: tempId,
      name: newTeamMember.trim(),
      role: 'Developer',
      status: 'Available',
      pending: true,
      color: getRandomTeamMemberColor()
    };

    // Update local state immediately for optimistic update
    setData(prevData => ({
      ...prevData,
      teamMembers: [...prevData.teamMembers, newMember]
    }));
    setNewTeamMember('');

    if (isOffline) {
      setPendingChanges(prev => ({
        ...prev,
        teamMembers: [...(prev.teamMembers || []), newMember]
      }));
      return;
    }

    try {
      const savedMember = await api.createTeamMember(newMember);
      setData(prevData => ({
        ...prevData,
        teamMembers: prevData.teamMembers.map(member => 
          member.id === tempId ? { ...savedMember, pending: false } : member
        )
      }));
    } catch (error) {
      console.error('Error adding team member:', error);
      setError('Failed to add team member. Will retry when online.');
      setPendingChanges(prev => ({
        ...prev,
        teamMembers: [...(prev.teamMembers || []), newMember]
      }));
    }
  };

  // Handle updating a team member
  const handleUpdateTeamMember = async (id, updates) => {
    try {
      const updatedMember = await api.updateTeamMember(id, updates);
      
      setData(prevData => ({
        ...prevData,
        teamMembers: prevData.teamMembers.map(member => 
          member.id === id ? updatedMember : member
        )
      }));
    } catch (err) {
      console.error('Error updating team member:', err);
      setError('Failed to update team member. Please try again.');
    }
  };

  // Handle deleting a team member
  const handleDeleteTeamMember = async (id) => {
    try {
      await api.deleteTeamMember(id);
      
      setData(prevData => ({
        ...prevData,
        teamMembers: prevData.teamMembers.filter(member => member.id !== id)
      }));
    } catch (err) {
      console.error('Error deleting team member:', err);
      setError('Failed to delete team member. Please try again.');
    }
  };
  
  // Calculate due date status
  const getDueDateStatus = (dueDate) => {
    if (!dueDate) return 'none';
    
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize today's date
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0); // Normalize due date
    
    const diffTime = due - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); // Use ceil to include the due date itself
    
    if (diffDays < 0) return 'overdue';
    if (diffDays <= 3) return 'soon';
    return 'ontrack';
  };
  
  // Handle adding a burning issue
  const handleAddBurningIssue = async () => {
    try {
      if (!newBurningIssue.trim()) return;
      
      const newIssueData = {
        id: Date.now().toString(), // Temporary ID for local state
        description: newBurningIssue.trim(),
        status: 'active',
        createdAt: new Date().toISOString()
      };
      
      // Update local state immediately
      setData(prevData => ({
        ...prevData,
        burningIssues: [...prevData.burningIssues, newIssueData]
      }));
      
      // Clear the input
      setNewBurningIssue('');
      
      // Try to sync with backend if online
      if (!isOffline) {
        try {
          const createdIssue = await api.createBurningIssue(newIssueData);
          // Update with server response if successful
          setData(prevData => ({
            ...prevData,
            burningIssues: prevData.burningIssues.map(issue => 
              issue.id === newIssueData.id ? createdIssue : issue
            )
          }));
        } catch (err) {
          console.error('Error syncing burning issue:', err);
          // Add to pending changes if sync fails
          setPendingChanges(prev => [...prev, {
            type: 'create',
            data: newIssueData,
            endpoint: 'burningIssues'
          }]);
        }
      } else {
        // Add to pending changes if offline
        setPendingChanges(prev => [...prev, {
          type: 'create',
          data: newIssueData,
          endpoint: 'burningIssues'
        }]);
      }
    } catch (err) {
      console.error('Error creating burning issue:', err);
      setError('Failed to create burning issue. Please try again.');
    }
  };

  // Handle deleting a burning issue
  const handleDeleteBurningIssue = async (id) => {
    try {
      // Update local state first for immediate feedback
      setData(prevData => ({
        ...prevData,
        burningIssues: prevData.burningIssues.filter(issue => issue.id !== id)
      }));

      // Try to sync with backend if online
      if (!isOffline) {
        try {
          await api.deleteBurningIssue(id);
        } catch (err) {
          console.error('Error syncing burning issue deletion:', err);
          // Add to pending changes if sync fails
          setPendingChanges(prev => [...prev, {
            type: 'delete',
            id: id,
            endpoint: 'burningIssues'
          }]);
        }
      } else {
        // Add to pending changes if offline
        setPendingChanges(prev => [...prev, {
          type: 'delete',
          id: id,
          endpoint: 'burningIssues'
        }]);
      }
    } catch (err) {
      console.error('Error deleting burning issue:', err);
      setError('Failed to delete burning issue. Please try again.');
    }
  };
  
  const handleUpdateExecutiveStatus = (id, status) => {
    const updatedExecutives = data.executives.map(exec => 
      exec.id === id ? { ...exec, status } : exec
    );
    setData({
      ...data,
      executives: updatedExecutives
    });
  };
  
  const handleUpdateManagerStatus = (id, status) => {
    const updatedManagers = data.regionManagers.map(manager => 
      manager.id === id ? { ...manager, status } : manager
    );
    setData({
      ...data,
      regionManagers: updatedManagers
    });
  };
  
  // Update colors for dark theme
  const priorityColors = {
    low: 'bg-blue-900 text-blue-300',
    medium: 'bg-amber-900 text-amber-300',
    high: 'bg-rose-900 text-rose-300'
  };
  
  // Due date colors
  const dueDateColors = {
    overdue: 'text-rose-400',
    soon: 'text-amber-400',
    ontrack: 'text-emerald-400',
    none: 'text-gray-500'
  };

  // Render a task card
  const renderTaskCard = (task) => {
    if (!task || !task.id || !task.title) {
      console.error('Invalid task object:', task);
      return null;
    }

    const assigneeColor = getTeamMemberColor(task.assignee);
    const dueDateStatus = getDueDateStatus(task.dueDate);
    
    return (
      <div 
        key={task.id} 
        className="bg-gray-800 p-4 rounded-lg shadow-md border border-gray-700 mb-3 cursor-move transition-all hover:shadow-lg"
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData('text/plain', task.id);
          handleDragStart(task);
        }}
      >
        <div className="flex justify-between items-start">
          <h3 className="font-medium text-white">{task.title}</h3>
          <div className="flex space-x-1">
            <button 
              className="text-gray-400 hover:text-blue-400 transition-colors"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setEditingTask({ ...task });
              }}
            >
              <Edit2 size={14} />
            </button>
            <button 
              className="text-gray-400 hover:text-rose-400 transition-colors"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (window.confirm('Are you sure you want to delete this task?')) {
                  handleDeleteTask(task.id);
                }
              }}
            >
              <X size={14} />
            </button>
          </div>
        </div>
        
        {task.description && (
          <p className="text-sm text-gray-400 mt-2">{task.description}</p>
        )}

        <div className="mt-3 flex flex-wrap gap-2">
          <span className={`text-xs px-2 py-1 rounded-full ${priorityColors[task.priority] || priorityColors.medium}`}>
            {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
          </span>
          
          <span className="text-xs px-2 py-1 rounded-full bg-gray-700 text-gray-300">
            {data.categories.find(c => c.id === task.category)?.title || 'Uncategorized'}
          </span>
        </div>
        
        <div className="mt-3 pt-3 border-t border-gray-700 text-xs text-gray-400">
          {task.assignee && (
            <div className="flex items-center mt-1">
              <div className={`w-4 h-4 rounded-full bg-gradient-to-r ${assigneeColor} mr-2`}></div>
              <span className="font-medium">Assigned to: {task.assignee}</span>
            </div>
          )}
          
          {task.for && (
            <div className="flex items-center mt-1">
              <span className="font-medium">For: {task.for}</span>
            </div>
          )}
          
          {task.dueDate && (
            <div className={`flex items-center mt-1 ${dueDateColors[dueDateStatus]}`}>
              <Calendar size={12} className="mr-1" />
              <span>Due: {task.dueDate}</span>
              {dueDateStatus === 'overdue' && <span className="ml-1">(Overdue)</span>}
              {dueDateStatus === 'soon' && <span className="ml-1">(Due Soon)</span>}
            </div>
          )}
        </div>
      </div>
    );
  };

  // Handle adding a support item
  const handleAddSupportItem = async () => {
    try {
      if (!newSupportItem.trim()) return;
      
      const newItemData = {
        id: Date.now().toString(), // Temporary ID for local state
        description: newSupportItem.trim(),
        status: 'active',
        createdAt: new Date().toISOString()
      };
      
      // Update local state immediately for optimistic update
      setData(prevData => ({
        ...prevData,
        supportItems: [...prevData.supportItems, newItemData]
      }));
      
      // Clear the input immediately
      setNewSupportItem('');
      
      // Try to sync with backend if online
      if (!isOffline) {
        try {
          const createdItem = await api.createSupportItem(newItemData);
          // Update with server response if successful
          setData(prevData => ({
            ...prevData,
            supportItems: prevData.supportItems.map(item => 
              item.id === newItemData.id ? createdItem : item
            )
          }));
        } catch (err) {
          console.warn('Error syncing support item:', err);
          // Add to pending changes if sync fails
          setPendingChanges(prev => [...prev, {
            type: 'create',
            data: newItemData,
            endpoint: 'supportItems'
          }]);
        }
      } else {
        // Add to pending changes if offline
        setPendingChanges(prev => [...prev, {
          type: 'create',
          data: newItemData,
          endpoint: 'supportItems'
        }]);
      }
    } catch (err) {
      console.error('Error creating support item:', err);
      setError('Failed to create support item. Please try again.');
    }
  };

  // Handle deleting a support item
  const handleDeleteSupportItem = async (id) => {
    try {
      // Update local state first for immediate feedback
      setData(prevData => ({
        ...prevData,
        supportItems: prevData.supportItems.filter(item => item.id !== id)
      }));

      // Try to sync with backend if online
      if (!isOffline) {
        try {
          await api.deleteSupportItem(id);
        } catch (err) {
          console.error('Error syncing support item deletion:', err);
          // Add to pending changes if sync fails
          setPendingChanges(prev => [...prev, {
            type: 'delete',
            id: id,
            endpoint: 'supportItems'
          }]);
        }
      } else {
        // Add to pending changes if offline
        setPendingChanges(prev => [...prev, {
          type: 'delete',
          id: id,
          endpoint: 'supportItems'
        }]);
      }
    } catch (err) {
      console.error('Error deleting support item:', err);
      setError('Failed to delete support item. Please try again.');
    }
  };

  // PDF Report Generation
  const generatePdfReport = () => {
    const doc = new jsPDF();
    const pageHeight = doc.internal.pageSize.height || doc.internal.pageSize.getHeight();
    const pageWidth = doc.internal.pageSize.width || doc.internal.pageSize.getWidth();
    let yPos = 15;
    const lineSpacing = 5;
    const sectionSpacing = 10;
    const margin = 15;
    const maxLineWidth = pageWidth - margin * 2;

    const checkAndAddPage = (neededHeight = 30) => {
      if (yPos + neededHeight > pageHeight - margin) {
        doc.addPage();
        yPos = margin;
      }
    };

    // Add Orkin Logo
    const logoWidth = 40;
    const logoHeight = 20;
    const logoX = (pageWidth - logoWidth) / 2; // Center the logo horizontally
    const logoY = margin;
    
    // Load and add logo image
    const addLogoToReport = () => {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          try {
            doc.addImage(img, 'PNG', logoX, logoY, logoWidth, logoHeight);
            resolve();
          } catch (error) {
            console.error('Error adding logo to PDF:', error);
            resolve();
          }
        };
        img.onerror = () => {
          console.error('Error loading logo image');
          resolve();
        };
        img.src = '/orkin-logo.png';
      });
    };

    // Generate the report
    const generateReport = async () => {
      await addLogoToReport();

      // Adjust starting position for title to account for logo
      yPos = logoY + logoHeight + 10;

      // Title and Date
      doc.setFontSize(20);
      doc.setFont(undefined, 'bold');
      doc.text('Orkin Canada IT Weekly Rundown', pageWidth / 2, yPos, { align: 'center' });
      yPos += lineSpacing * 1.5;
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      doc.text(`Generated on: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, pageWidth / 2, yPos, { align: 'center' });
      yPos += sectionSpacing * 1.5;

      // Function to add section title
      const addSectionTitle = (title) => {
        checkAndAddPage(lineSpacing * 1.5);
        doc.setFontSize(14); // Reduced from 16
        doc.setFont(undefined, 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text(title, margin, yPos);
        doc.setFont(undefined, 'normal');
        yPos += lineSpacing * 1.5;
      };

      // Function to add task item with details
      const addTaskItem = (task) => {
        checkAndAddPage(lineSpacing * 3);
        doc.setFontSize(9); // Reduced from 11
        doc.setTextColor(0, 0, 0);
        const titleLines = doc.splitTextToSize(`• ${task.title}`, maxLineWidth - 10);
        doc.text(titleLines, margin + 3, yPos);
        yPos += titleLines.length * (lineSpacing * 0.7);

        if (task.description) {
          checkAndAddPage(lineSpacing);
          doc.setFontSize(8);
          doc.setTextColor(100);
          const descLines = doc.splitTextToSize(`  Description: ${task.description}`, maxLineWidth - 10);
          doc.text(descLines, margin + 3, yPos);
          yPos += descLines.length * (lineSpacing * 0.7);
        }

        if (task.assignee) {
          checkAndAddPage(lineSpacing);
          doc.setFontSize(8); // Reduced from 10
          doc.setTextColor(100);
          doc.text(`  Assigned to: ${task.assignee}`, margin + 3, yPos);
          yPos += lineSpacing * 0.7;
        }

        if (task.for) {
          checkAndAddPage(lineSpacing);
          doc.setFontSize(8);
          doc.setTextColor(100);
          doc.text(`  For: ${task.for}`, margin + 3, yPos);
          yPos += lineSpacing * 0.7;
        }

        if (task.dueDate) {
          checkAndAddPage(lineSpacing);
          doc.setFontSize(8);
          doc.setTextColor(100);
          doc.text(`  Due Date: ${task.dueDate}`, margin + 3, yPos);
          yPos += lineSpacing * 0.7;
        }

        if (task.priority) {
          checkAndAddPage(lineSpacing);
          doc.setFontSize(8);
          doc.setTextColor(100);
          doc.text(`  Priority: ${task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}`, margin + 3, yPos);
          yPos += lineSpacing * 0.7;
        }

        yPos += lineSpacing * 0.5;
      };

      // Burning Issues
      addSectionTitle('Burning Issues');
      if (data.burningIssues.length === 0) {
        doc.setFontSize(8);
        doc.setTextColor(100);
        doc.text('  No burning issues', margin + 3, yPos);
        yPos += lineSpacing;
      } else {
        data.burningIssues.forEach(issue => {
          checkAndAddPage(lineSpacing);
          doc.setFontSize(9);
          doc.setTextColor(0, 0, 0);
          doc.text(`  • ${issue.description}`, margin + 3, yPos);
          yPos += lineSpacing;
        });
      }
      yPos += sectionSpacing;

      // Burning Issues for Branch Managers
      addSectionTitle('Burning Issues for Branch Managers');
      if (data.branchManagerIssues.length === 0) {
        doc.setFontSize(8);
        doc.setTextColor(100);
        doc.text('  No burning issues for branch managers', margin + 3, yPos);
        yPos += lineSpacing;
      } else {
        data.branchManagerIssues.forEach(issue => {
          checkAndAddPage(lineSpacing);
          doc.setFontSize(9);
          doc.setTextColor(0, 0, 0);
          doc.text(`  • ${issue.description}`, margin + 3, yPos);
          yPos += lineSpacing;
        });
      }
      yPos += sectionSpacing;

      // Ongoing Support Items
      addSectionTitle('Ongoing Support Items');
      if (data.supportItems.length === 0) {
        doc.setFontSize(8);
        doc.setTextColor(100);
        doc.text('  No ongoing support items', margin + 3, yPos);
        yPos += lineSpacing;
      } else {
        data.supportItems.forEach(item => {
          checkAndAddPage(lineSpacing);
          doc.setFontSize(9);
          doc.setTextColor(0, 0, 0);
          doc.text(`  • ${item.description}`, margin + 3, yPos);
          yPos += lineSpacing;
        });
      }
      yPos += sectionSpacing;

      // Ongoing Projects
      addSectionTitle('Ongoing Projects');
      const ongoingProjects = data.tasks.filter(task => 
        task.category === 'projects' && 
        task.status === 'inprogress'
      );
      if (ongoingProjects.length === 0) {
        doc.setFontSize(8);
        doc.setTextColor(100);
        doc.text('  No ongoing projects', margin + 3, yPos);
        yPos += lineSpacing;
      } else {
        ongoingProjects.forEach(addTaskItem);
      }
      yPos += sectionSpacing;

      // Executives Section
      addSectionTitle('Executives');
      data.executives.forEach(executive => {
        checkAndAddPage(lineSpacing * 1.5);
        doc.setFontSize(12); // Reduced from 14
        doc.setFont(undefined, 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text(`${executive.name}`, margin, yPos);
        doc.setFont(undefined, 'normal');
        yPos += lineSpacing * 1.2;

        const execTasks = data.tasks.filter(task => 
          task.for === executive.name && 
          task.category === 'executives'
        );
        
        if (execTasks.length === 0) {
          doc.setFontSize(8);
          doc.setTextColor(100);
          doc.text('  No tasks assigned', margin + 3, yPos);
          yPos += lineSpacing;
        } else {
          execTasks.forEach(addTaskItem);
        }
        yPos += lineSpacing * 0.5;
      });
      yPos += sectionSpacing;

      // Region Managers Section
      addSectionTitle('Region Managers');
      data.regionManagers.forEach(manager => {
        checkAndAddPage(lineSpacing * 1.5);
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text(`${manager.name}`, margin, yPos);
        doc.setFont(undefined, 'normal');
        yPos += lineSpacing * 1.2;

        const managerTasks = data.tasks.filter(task => 
          task.for === manager.name && 
          task.category === 'regionmanagers'
        );
        
        if (managerTasks.length === 0) {
          doc.setFontSize(8);
          doc.setTextColor(100);
          doc.text('  No tasks assigned', margin + 3, yPos);
          yPos += lineSpacing;
        } else {
          managerTasks.forEach(addTaskItem);
        }
        yPos += lineSpacing * 0.5;
      });
      yPos += sectionSpacing;

      // Branch Managers Section
      addSectionTitle('Branch Managers');
      const branchManagerTasks = data.tasks.filter(task => task.category === 'branchmanagers');
      if (branchManagerTasks.length === 0) {
        doc.setFontSize(8);
        doc.setTextColor(100);
        doc.text('  No tasks assigned to branch managers', margin + 3, yPos);
      } else {
        branchManagerTasks.forEach(addTaskItem);
      }
      yPos += sectionSpacing;

      // Add Summary Section
      addSectionTitle('Complete Task Summary');
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      doc.text('This section includes all tasks, burning issues, and support items:', margin, yPos);
      yPos += lineSpacing * 1.5;

      // All Tasks Summary
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.text('All Tasks', margin, yPos);
      doc.setFont(undefined, 'normal');
      yPos += lineSpacing * 1.2;

      if (data.tasks.length === 0) {
        doc.setFontSize(8);
        doc.setTextColor(100);
        doc.text('  No tasks in the system', margin + 3, yPos);
        yPos += lineSpacing;
      } else {
        data.tasks.forEach(addTaskItem);
      }
      yPos += sectionSpacing;

      // All Burning Issues Summary
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.text('All Burning Issues', margin, yPos);
      doc.setFont(undefined, 'normal');
      yPos += lineSpacing * 1.2;

      if (data.burningIssues.length === 0) {
        doc.setFontSize(8);
        doc.setTextColor(100);
        doc.text('  No burning issues', margin + 3, yPos);
        yPos += lineSpacing;
      } else {
        data.burningIssues.forEach(issue => {
          checkAndAddPage(lineSpacing);
          doc.setFontSize(9);
          doc.setTextColor(0, 0, 0);
          doc.text(`  • ${issue.description}`, margin + 3, yPos);
          yPos += lineSpacing;
        });
      }
      yPos += sectionSpacing;

      // All Support Items Summary
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.text('All Support Items', margin, yPos);
      doc.setFont(undefined, 'normal');
      yPos += lineSpacing * 1.2;

      if (data.supportItems.length === 0) {
        doc.setFontSize(8);
        doc.setTextColor(100);
        doc.text('  No support items', margin + 3, yPos);
        yPos += lineSpacing;
      } else {
        data.supportItems.forEach(item => {
          checkAndAddPage(lineSpacing);
          doc.setFontSize(9);
          doc.setTextColor(0, 0, 0);
          doc.text(`  • ${item.description}`, margin + 3, yPos);
          yPos += lineSpacing;
        });
      }

      // Save the PDF
      doc.save(`orkin-it-weekly-${new Date().toISOString().split('T')[0]}.pdf`);
    };

    // Start report generation
    generateReport().catch(error => {
      console.error('Error generating report:', error);
    });
  };

  const [newBranchManagerIssue, setNewBranchManagerIssue] = useState('');

  const handleAddBranchManagerIssue = async () => {
    try {
      if (!newBranchManagerIssue.trim()) return;
      
      const newIssueData = {
        id: Date.now().toString(), // Temporary ID for local state
        description: newBranchManagerIssue.trim(),
        status: 'active',
        createdAt: new Date().toISOString()
      };
      
      // Update local state immediately
      setData(prevData => ({
        ...prevData,
        branchManagerIssues: [...prevData.branchManagerIssues, newIssueData]
      }));
      
      // Clear the input
      setNewBranchManagerIssue('');
      
      // Try to sync with backend if online
      if (!isOffline) {
        try {
          const createdIssue = await api.createBranchManagerIssue(newIssueData);
          // Update with server response if successful
          setData(prevData => ({
            ...prevData,
            branchManagerIssues: prevData.branchManagerIssues.map(issue => 
              issue.id === newIssueData.id ? createdIssue : issue
            )
          }));
        } catch (err) {
          console.error('Error syncing branch manager issue:', err);
          // Add to pending changes if sync fails
          setPendingChanges(prev => [...prev, {
            type: 'create',
            data: newIssueData,
            endpoint: 'branchManagerIssues'
          }]);
        }
      } else {
        // Add to pending changes if offline
        setPendingChanges(prev => [...prev, {
          type: 'create',
          data: newIssueData,
          endpoint: 'branchManagerIssues'
        }]);
      }
    } catch (err) {
      console.error('Error creating branch manager issue:', err);
      setError('Failed to create branch manager issue. Please try again.');
    }
  };

  // Handle deleting a branch manager issue
  const handleDeleteBranchManagerIssue = async (id) => {
    try {
      // Update local state first for immediate feedback
      setData(prevData => ({
        ...prevData,
        branchManagerIssues: prevData.branchManagerIssues.filter(issue => issue.id !== id)
      }));

      // Try to sync with backend if online
      if (!isOffline) {
        try {
          await api.deleteBranchManagerIssue(id);
        } catch (err) {
          console.error('Error syncing branch manager issue deletion:', err);
          // Add to pending changes if sync fails
          setPendingChanges(prev => [...prev, {
            type: 'delete',
            id: id,
            endpoint: 'branchManagerIssues'
          }]);
        }
      } else {
        // Add to pending changes if offline
        setPendingChanges(prev => [...prev, {
          type: 'delete',
          id: id,
          endpoint: 'branchManagerIssues'
        }]);
      }
    } catch (err) {
      console.error('Error deleting branch manager issue:', err);
      setError('Failed to delete branch manager issue. Please try again.');
    }
  };

  const handleCategoryChange = (e) => {
    const newCategory = e.target.value;
    setNewTask({
      ...newTask,
      category: newCategory,
      for: '', // Reset the "for" field when category changes
      status: newCategory === 'projects' ? 'inprogress' : newTask.status
    });
  };

  // Add a sync button component to the header
  const renderSyncButton = () => (
    <button
      className={`px-4 py-2 rounded-lg flex items-center ${
        isOffline 
          ? 'bg-gray-600 text-gray-300' 
          : isSyncing 
            ? 'bg-indigo-600 text-white animate-pulse'
            : 'bg-green-600 text-white'
      }`}
      onClick={syncWithBackend}
      disabled={isOffline || isSyncing || pendingChanges.length === 0}
    >
      {isOffline ? (
        <>
          <span className="mr-2">Offline Mode</span>
          <span className="text-xs">({pendingChanges.length} pending)</span>
        </>
      ) : isSyncing ? (
        <>
          <span className="mr-2">Syncing...</span>
          <span className="text-xs">({pendingChanges.length} remaining)</span>
        </>
      ) : (
        <>
          <span className="mr-2">Sync</span>
          <span className="text-xs">({pendingChanges.length} changes)</span>
        </>
      )}
    </button>
  );

  return (
    <div className={`flex h-screen ${darkMode ? 'bg-gray-900 text-gray-100' : 'bg-gray-50 text-gray-900'}`}>
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'w-64' : 'w-16'} ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-r transition-all duration-300 flex flex-col fixed h-full z-50`}>
        <div className="p-4 flex items-center">
          {/* Logo and Title Container */}
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center">
              <div className={`${sidebarOpen ? 'w-24' : 'w-12'} transition-all duration-300`}>
                <img 
                  src="/orkin-logo.png" 
                  alt="Orkin Canada Logo" 
                  className="w-full h-auto"
                  style={{ 
                    objectFit: 'contain',
                    maxHeight: sidebarOpen ? '48px' : '32px'
                  }}
                  onError={(e) => {
                    console.error('Error loading logo in sidebar');
                    e.target.style.display = 'none';
                  }}
                />
              </div>
              <h1 className={`font-bold ml-2 ${sidebarOpen ? 'block' : 'hidden'}`}>IT Tasks</h1>
            </div>
            <button 
              className={`p-2 rounded-lg ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'} transition-colors`}
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}
            >
              <Menu size={20} className={`transform transition-transform duration-300 ${sidebarOpen ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>
        
        <nav className="flex-1 p-2">
          <ul className="space-y-1">
            <li>
              <div className="flex flex-col">
                 <button 
                   className={`w-full flex items-center p-3 rounded-lg transition-colors ${activeTab === 'board' ? (darkMode ? 'bg-indigo-900 text-indigo-200' : 'bg-indigo-100 text-indigo-800') : (darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100')}`}
                   onClick={() => {
                     setActiveTab('board');
                     setSelectedBoardMember('all'); // Reset filter when clicking main board
                   }}
                 >
                   <LayoutGrid size={18} className="min-w-5" />
                   {sidebarOpen && <span className="ml-3 flex-1 text-left">Board (All)</span>} 
                   {/* Optional: Add an indicator if filter is active? */}
                 </button>
                 
                 {/* Team Member Filter Dropdown - Nested */}
                 {sidebarOpen && activeTab === 'board' && (
                   <div className="pl-10 pr-3 pt-1 pb-2" onClick={(e) => e.stopPropagation()}> 
                     <div className="relative">
                       <select
                         className={`w-full appearance-none pl-3 pr-8 py-1 rounded border text-xs ${darkMode ? 'border-gray-600 bg-gray-700 text-gray-300' : 'border-gray-300 bg-gray-100 text-gray-700'} focus:outline-none focus:ring-1 focus:ring-indigo-500`}
                         value={selectedBoardMember}
                         onChange={(e) => setSelectedBoardMember(e.target.value)}
                       >
                         <option value="all">All Members</option>
                         {data.teamMembers.map(member => (
                           <option key={member.id} value={member.name}>{member.name}</option>
                         ))}
                       </select>
                       <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" size={14} />
                     </div>
                   </div>
                 )}
               </div>
            </li>
            
            <li>
              <button 
                className={`w-full flex items-center p-3 rounded-lg transition-colors ${activeTab === 'overview' ? (darkMode ? 'bg-indigo-900 text-indigo-200' : 'bg-indigo-100 text-indigo-800') : (darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100')}`}
                onClick={() => setActiveTab('overview')}
              >
                <LayoutDashboard size={18} className="min-w-5" />
                {sidebarOpen && <span className="ml-3">Overview</span>}
              </button>
            </li>
            <li>
              <button 
                className={`w-full flex items-center p-3 rounded-lg transition-colors ${activeTab === 'executives' ? (darkMode ? 'bg-indigo-900 text-indigo-200' : 'bg-indigo-100 text-indigo-800') : (darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100')}`}
                onClick={() => setActiveTab('executives')}
              >
                <Briefcase size={18} className="min-w-5" />
                {sidebarOpen && <span className="ml-3">Executives</span>}
              </button>
            </li>
            <li>
              <button 
                className={`w-full flex items-center p-3 rounded-lg transition-colors ${activeTab === 'managers' ? (darkMode ? 'bg-indigo-900 text-indigo-200' : 'bg-indigo-100 text-indigo-800') : (darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100')}`}
                onClick={() => setActiveTab('managers')}
              >
                <Building2 size={18} className="min-w-5" />
                {sidebarOpen && <span className="ml-3">Region Managers</span>}
              </button>
            </li>
            {/* Dynamic Team Member Tabs */}
            {sidebarOpen && (
               <li className="pt-4 mt-4 border-t border-gray-700">
                 <span className="px-3 text-xs font-semibold uppercase text-gray-500">Team Members</span>
               </li>
            )}
            {data.teamMembers.map(member => (
              <li key={member.id}>
                <div className="flex items-center justify-between">
                  <button 
                    className={`w-full flex items-center p-3 rounded-lg transition-colors ${activeTab === member.id ? (darkMode ? 'bg-indigo-900 text-indigo-200' : 'bg-indigo-100 text-indigo-800') : (darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100')}`}
                    onClick={() => setActiveTab(member.id)}
                  >
                    <div className={`w-4 h-4 rounded-full bg-gradient-to-r ${member.color} min-w-4 flex-shrink-0`}></div>
                    {sidebarOpen && <span className="ml-3">{member.name}</span>}
                  </button>
                  {sidebarOpen && (
                    <button
                      className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm(`Are you sure you want to remove ${member.name}? This action cannot be undone.`)) {
                          handleDeleteTeamMember(member.id);
                        }
                      }}
                      title="Remove team member"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              </li>
            ))}
             <li>
              <button 
                className={`w-full flex items-center p-3 rounded-lg transition-colors mt-2 ${showAddTeamMember ? 'bg-gray-700' : (darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100')}`}
                onClick={() => setShowAddTeamMember(true)}
              >
                <Plus size={18} className="min-w-5 text-green-500" />
                {sidebarOpen && <span className="ml-3 text-sm">Add Member</span>}
              </button>
            </li>
            {/* Generate Report Button */}
            <li className="pt-4 mt-4 border-t border-gray-700">
              <button 
                className={`w-full flex items-center p-3 rounded-lg transition-colors ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                onClick={generatePdfReport}
              >
                <FileDown size={18} className="min-w-5 text-teal-400" />
                {sidebarOpen && <span className="ml-3 text-sm">Generate Report</span>}
              </button>
            </li>
          </ul>
        </nav>
        
        <div className={`p-4 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          {sidebarOpen && (
            <div className="flex items-center justify-between">
              <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Tasks: {data.tasks.length} / 
                Done: {data.tasks.filter(t => t.status === 'done').length}
              </div>
              <button 
                onClick={() => setDarkMode(!darkMode)}
                className={`p-1 rounded ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-200'}`}
              >
                {darkMode ? '🌙' : '☀️'}
              </button>
            </div>
          )}
        </div>
      </div>
      
      {/* Main Content Area */}
      <div className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 ${sidebarOpen ? 'ml-64' : 'ml-16'}`}>
        {/* Header */}
        <header className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-b p-4 relative z-10`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex-1 flex justify-center">
              <h1 className="text-xl font-bold">IT Weekly Overview</h1>
            </div>
            <div className="flex items-center gap-2">
              {activeTab === 'board' && (
                <>
                  {/* Team Member Filter Dropdown (Header) */}
                  <div className="relative">
                    <select
                      className={`appearance-none pl-4 pr-10 py-2 rounded-lg border ${darkMode ? 'border-gray-700 bg-gray-700' : 'border-gray-200 bg-gray-50'} focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                      value={selectedBoardMember}
                      onChange={(e) => setSelectedBoardMember(e.target.value)}
                    >
                      <option value="all">All Members</option>
                      {data.teamMembers.map(member => (
                        <option key={member.id} value={member.name}>{member.name}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                  </div>
                  
                  {/* Search Input */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                    <input
                      type="text"
                      placeholder="Search tasks..."
                      className={`pl-10 pr-4 py-2 rounded-lg border ${darkMode ? 'border-gray-700 bg-gray-700' : 'border-gray-200 bg-gray-50'} focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  
                  <div className="relative">
                    <select
                      className={`appearance-none pl-4 pr-10 py-2 rounded-lg border ${darkMode ? 'border-gray-700 bg-gray-700' : 'border-gray-200 bg-gray-50'} focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                    >
                      <option value="all">All Categories</option>
                      {data.categories.map(category => (
                        <option key={category.id} value={category.id}>{category.title}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                  </div>
                </>
              )}
              
              <button 
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center transition-colors"
                onClick={() => {
                  resetNewTask();
                  setShowAddTask(true);
                }}
              >
                <Plus size={16} className="mr-2" /> Add Task
              </button>
            </div>
          </div>
        </header>
        
        {/* Board View */}
        {activeTab === 'board' && (
          <div className="flex-1 overflow-x-auto p-4">
            <div className="flex h-full">
              {/* Main Kanban Columns */}
              <div className="flex gap-4 overflow-x-auto">
                {data.columns.map(column => (
                  <div 
                    key={column.id} 
                    className="flex-shrink-0 w-80 flex flex-col h-full"
                    onDragOver={(e) => handleDragOver(e, column.id)}
                    onDrop={(e) => handleDrop(e, column.id)}
                  >
                    <div className={`${column.color} px-4 py-2 rounded-t-lg flex justify-between items-center`}>
                      <h2 className="font-semibold text-white">{column.title}</h2>
                      <span className="bg-white bg-opacity-30 text-white text-xs font-medium px-2 py-1 rounded-full">
                        {filteredTasks.filter(task => task.status === column.id).length}
                      </span>
                    </div>
                    <div className={`flex-1 ${darkMode ? 'bg-gray-800' : 'bg-gray-100'} p-3 rounded-b-lg overflow-y-auto`} style={{minHeight: "300px"}}>
                      {filteredTasks
                        .filter(task => task.status === column.id)
                        .map(task => renderTaskCard(task))}
                        
                      {filteredTasks.filter(task => task.status === column.id).length === 0 && (
                        <div className="text-center py-10 text-gray-400 dark:text-gray-600 text-sm">
                          No tasks in this column
                        </div>
                      )}
                    </div>
                    <div className="p-3 border-t border-gray-700">
                      <button 
                        className="w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center justify-center text-sm transition-colors"
                        onClick={() => {
                          resetNewTask();
                          setNewTask({
                            ...newTask,
                            status: column.id,
                            category: column.id === 'inprogress' ? 'projects' : 'executives'
                          });
                          setShowAddTask(true);
                        }}
                      >
                        <Plus size={16} className="mr-1" /> Add Task
                      </button>
                    </div>
                  </div>
                ))}

                {/* Ongoing Projects Section */}
                <div className="flex-shrink-0 w-80">
                  <div 
                    className={`rounded-lg ${darkMode ? 'bg-gradient-to-br from-rose-900 via-rose-800 to-gray-900' : 'bg-rose-50'} border border-rose-600 shadow-lg h-full flex flex-col`}
                    onDragOver={(e) => handleDragOver(e, 'inprogress')}
                    onDrop={(e) => handleDrop(e, 'inprogress')}
                  >
                    <div className="px-4 py-2 rounded-t-lg flex justify-between items-center">
                      <h2 className="font-semibold text-white flex items-center">
                        <ListChecks size={20} className="mr-2 text-rose-200" />
                        Ongoing Projects
                      </h2>
                      <span className="bg-white bg-opacity-30 text-white text-xs font-medium px-2 py-1 rounded-full">
                        {data.tasks.filter(task => task.status === 'inprogress' && task.category === 'projects').length}
                      </span>
                    </div>
                    <div className={`flex-1 ${darkMode ? 'bg-gray-800' : 'bg-gray-100'} p-3 rounded-b-lg overflow-y-auto`}>
                      <div className="space-y-3">
                        {data.tasks
                          .filter(task => task.status === 'inprogress' && task.category === 'projects')
                          .map(task => (
                            <div 
                              key={task.id} 
                              className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'} flex`}
                              draggable
                              onDragStart={(e) => {
                                e.dataTransfer.setData('text/plain', task.id);
                                handleDragStart(task);
                              }}
                            >
                              <div className={`mr-3 w-1 rounded-full bg-gradient-to-b ${getTeamMemberColor(task.assignee)}`}></div>
                              <div className="flex-1">
                                <div className="font-medium">{task.title}</div>
                                {task.description && <div className="text-sm text-gray-400 mt-1">{task.description}</div>}
                                <div className="text-xs text-gray-500 mt-2">Assigned to: {task.assignee || 'Unassigned'}</div>
                                {task.for && (
                                  <div className="text-xs text-gray-500 mt-1">For: {task.for}</div>
                                )}
                                {task.dueDate && (
                                  <div className="text-xs text-gray-500 mt-1">
                                    Due: {task.dueDate}
                                    <span className={`ml-2 px-2 py-1 rounded-full text-xs ${
                                      task.priority === 'high' ? 'bg-rose-900 text-rose-300' :
                                      task.priority === 'medium' ? 'bg-amber-900 text-amber-300' :
                                      'bg-blue-900 text-blue-300'
                                    }`}>
                                      {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                                    </span>
                                  </div>
                                )}
                              </div>
                              <div className="flex space-x-2">
                                <button 
                                  className="text-gray-400 hover:text-blue-400 transition-colors"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setEditingTask({ ...task });
                                  }}
                                >
                                  <Edit2 size={16} />
                                </button>
                                <button 
                                  className="text-gray-400 hover:text-rose-400 transition-colors"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    if (window.confirm('Are you sure you want to delete this task?')) {
                                      handleDeleteTask(task.id);
                                    }
                                  }}
                                >
                                  <X size={16} />
                                </button>
                              </div>
                            </div>
                          ))}
                        {data.tasks.filter(task => task.status === 'inprogress' && task.category === 'projects').length === 0 && (
                          <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'} text-gray-500`}>No ongoing projects.</div>
                        )}
                      </div>
                    </div>
                    <div className="p-3 border-t border-rose-600">
                      <button 
                        className="w-full px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg flex items-center justify-center text-sm transition-colors"
                        onClick={() => {
                          setNewTask({
                            ...newTask,
                            category: 'projects',
                            status: 'inprogress'
                          });
                          setShowAddTask(true);
                        }}
                      >
                        <Plus size={16} className="mr-1" /> Add Project
                      </button>
                    </div>
                  </div>
                </div>

                {/* Burning Issues Section */}
                <div className="flex-shrink-0 w-80">
                  <div className={`rounded-lg ${darkMode ? 'bg-gradient-to-br from-amber-900 via-amber-800 to-gray-900' : 'bg-amber-50'} border border-amber-600 shadow-lg h-full flex flex-col`}>
                    <div className="px-4 py-2 rounded-t-lg flex justify-between items-center">
                      <h2 className="font-semibold text-white flex items-center">
                        <Flame size={20} className="mr-2 text-amber-200" />
                        Burning Issues
                      </h2>
                      <span className="bg-white bg-opacity-30 text-white text-xs font-medium px-2 py-1 rounded-full">
                        {data.burningIssues.length}
                      </span>
                    </div>
                    <div className={`flex-1 ${darkMode ? 'bg-gray-800' : 'bg-gray-100'} p-3 rounded-b-lg overflow-y-auto`}>
                      <div className="space-y-3">
                        {data.burningIssues.map((issue, index) => (
                          <div key={index} className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'} flex justify-between items-center`}>
                            <div className="flex-1">
                              <div className="font-medium">{issue.description}</div>
                            </div>
                            <button 
                              className="text-gray-400 hover:text-amber-400 transition-colors"
                              onClick={() => handleDeleteBurningIssue(issue.id)}
                            >
                              <X size={16} />
                            </button>
                          </div>
                        ))}
                        {data.burningIssues.length === 0 && (
                          <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'} text-gray-500`}>No burning issues.</div>
                        )}
                      </div>
                    </div>
                    <div className="p-3 border-t border-amber-600">
                      <div className="flex">
                        <input 
                          type="text"
                          className={`flex-1 px-3 py-2 rounded-l-lg border-t border-l border-b ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'}`}
                          value={newBurningIssue}
                          onChange={(e) => setNewBurningIssue(e.target.value)}
                          placeholder="Add a new burning issue..."
                        />
                        <button 
                          className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-r-lg transition-colors"
                          onClick={handleAddBurningIssue}
                          disabled={!newBurningIssue.trim()}
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Overview Tab Content */}
        {activeTab === 'overview' && (
          <div className="flex-1 p-6 overflow-auto space-y-6">
            {/* Burning Issues (Moved to Top) */}
            <div className={`rounded-lg ${darkMode ? 'bg-gradient-to-br from-rose-900 via-rose-800 to-gray-900' : 'bg-rose-50'} border border-rose-600 shadow-lg p-6`}>
              <h2 className="text-xl font-bold mb-4 flex items-center ${darkMode ? 'text-rose-200' : 'text-rose-800'}">
                <Flame size={20} className="mr-2 text-rose-400" />
                Burning Issues
              </h2>
              <div className="space-y-2">
                {data.burningIssues.length > 0 ? 
                  data.burningIssues.map((issue, index) => (
                    <div key={index} className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'} flex justify-between items-center`}>
                      <div>{issue.description}</div>
                      <button 
                        className="text-gray-400 hover:text-rose-400"
                        onClick={() => handleDeleteBurningIssue(issue.id)}
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))
                  :
                  <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'} text-gray-500`}>No burning issues currently</div>
                }
                <div className="mt-3 flex">
                  <input 
                    type="text"
                    className={`flex-1 px-3 py-2 rounded-l-lg border-t border-l border-b ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'}`}
                    value={newBurningIssue}
                    onChange={(e) => setNewBurningIssue(e.target.value)}
                    placeholder="Add a new burning issue..."
                  />
                  <button 
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-r-lg"
                    onClick={handleAddBurningIssue}
                    disabled={!newBurningIssue.trim()}
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>

            {/* Burning Issues for Branch Managers */}
            <div className={`rounded-lg ${darkMode ? 'bg-gradient-to-br from-amber-900 via-amber-800 to-gray-900' : 'bg-amber-50'} border border-amber-600 shadow-lg p-6`}>
              <h2 className="text-xl font-bold mb-4 flex items-center ${darkMode ? 'text-amber-200' : 'text-amber-800'}">
                <AlertTriangle size={20} className="mr-2 text-amber-400" />
                Burning Issues for Branch Managers
              </h2>
              <div className="space-y-3">
                {data.branchManagerIssues.length > 0 ? 
                  data.branchManagerIssues.map((issue, index) => (
                    <div key={index} className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'} flex justify-between items-center`}>
                      <div className="flex-1">
                        <div className="font-medium">{issue.description}</div>
                      </div>
                      <button 
                        className="text-gray-400 hover:text-amber-400"
                        onClick={() => handleDeleteBranchManagerIssue(issue.id)}
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))
                  :
                  <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'} text-gray-500`}>No burning issues for branch managers currently</div>
                }
                <div className="mt-3 flex">
                  <input 
                    type="text"
                    className={`flex-1 px-3 py-2 rounded-l-lg border-t border-l border-b ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'}`}
                    value={newBranchManagerIssue}
                    onChange={(e) => setNewBranchManagerIssue(e.target.value)}
                    placeholder="Add a new branch manager issue..."
                  />
                  <button 
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-r-lg"
                    onClick={handleAddBranchManagerIssue}
                    disabled={!newBranchManagerIssue.trim()}
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>

            {/* Ongoing Support Items (Below Burning Issues) */}
            <div className={`rounded-lg ${darkMode ? 'bg-gradient-to-br from-blue-900 via-blue-800 to-gray-900' : 'bg-blue-50'} border border-blue-600 shadow-lg p-6`}>
              <h2 className="text-xl font-bold mb-4 flex items-center ${darkMode ? 'text-blue-200' : 'text-blue-800'}">
                <Wrench size={20} className="mr-2 text-blue-400" />
                Ongoing Support Items
              </h2>
              <div className="space-y-2">
                {data.supportItems.length > 0 ? 
                  data.supportItems.map((item, index) => (
                    <div key={index} className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'} flex justify-between items-center`}>
                      <div>{item.description}</div>
                      <button 
                        className="text-gray-400 hover:text-blue-400"
                        onClick={() => handleDeleteSupportItem(item.id)}
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))
                  :
                  <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'} text-gray-500`}>No ongoing support items currently</div>
                }
                <div className="mt-3 flex">
                  <input 
                    type="text"
                    className={`flex-1 px-3 py-2 rounded-l-lg border-t border-l border-b ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'}`}
                    value={newSupportItem}
                    onChange={(e) => setNewSupportItem(e.target.value)}
                    placeholder="Add a new support item..."
                  />
                  <button 
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-r-lg"
                    onClick={handleAddSupportItem}
                    disabled={!newSupportItem.trim()}
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>

            {/* Ongoing Projects (Below Support Items) */}
            <div className={`rounded-lg ${darkMode ? 'bg-gradient-to-br from-indigo-900 via-indigo-800 to-gray-900' : 'bg-indigo-50'} border border-indigo-600 shadow-lg p-6`}>
              <h2 className="text-xl font-bold mb-4 flex items-center ${darkMode ? 'text-indigo-200' : 'text-indigo-800'}">
                <ListChecks size={20} className="mr-2 text-indigo-400" />
                Ongoing Projects
              </h2>
              <div className="space-y-3">
                {data.tasks
                  .filter(task => task.status === 'inprogress' && task.category === 'projects')
                  .map(task => (
                    <div key={task.id} className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'} flex`}>
                      <div className={`mr-3 w-1 rounded-full bg-gradient-to-b ${getTeamMemberColor(task.assignee)}`}></div>
                      <div className="flex-1">
                        <div className="font-medium">{task.title}</div>
                        {task.description && <div className="text-sm text-gray-400 mt-1">{task.description}</div>}
                        <div className="text-xs text-gray-500 mt-2">Assigned to: {task.assignee || 'Unassigned'}</div>
                        {task.dueDate && (
                          <div className="text-xs text-gray-500 mt-1">
                            Due: {task.dueDate}
                            <span className={`ml-2 px-2 py-1 rounded-full text-xs ${
                              task.priority === 'high' ? 'bg-rose-900 text-rose-300' :
                              task.priority === 'medium' ? 'bg-amber-900 text-amber-300' :
                              'bg-blue-900 text-blue-300'
                            }`}>
                              {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="flex space-x-2">
                        <button 
                          className="text-gray-400 hover:text-blue-400 transition-colors"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setEditingTask({ ...task });
                          }}
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          className="text-gray-400 hover:text-rose-400 transition-colors"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (window.confirm('Are you sure you want to delete this task?')) {
                              handleDeleteTask(task.id);
                            }
                          }}
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                {data.tasks.filter(task => task.status === 'inprogress' && task.category === 'projects').length === 0 && (
                  <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'} text-gray-500`}>No ongoing projects.</div>
                )}
                <button 
                  className="mt-3 text-indigo-400 hover:text-indigo-300 text-sm flex items-center"
                  onClick={() => {
                    resetNewTask();
                    setNewTask({
                      ...newTask,
                      category: 'projects',
                      status: 'inprogress'
                    });
                    setShowAddTask(true);
                  }}
                >
                  <Plus size={16} className="mr-1" /> Add Project
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Individual Team Member View */}
        {data.teamMembers.some(member => member.id === activeTab) && (
          <div className="flex-1 p-6 overflow-auto">
            {(() => {
              const currentMember = data.teamMembers.find(member => member.id === activeTab);
              const memberTasks = data.tasks.filter(task => task.assignee === currentMember.name);
              
              return (
                <>
                  <div className="flex items-center mb-6">
                     <div className={`w-10 h-10 rounded-full bg-gradient-to-r ${currentMember.color} mr-4 flex items-center justify-center text-white font-bold text-xl`}>
                       {currentMember.name.charAt(0)}
                     </div>
                     <h2 className="text-2xl font-bold">Tasks for {currentMember.name}</h2>
                  </div>

                  {memberTasks.length > 0 ? (
                     <div className="space-y-4">
                       {memberTasks.map(task => renderTaskCard(task))}
                     </div>
                  ) : (
                     <div className={`p-6 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-gray-100'} text-center text-gray-500`}>
                       No tasks assigned to {currentMember.name}.
                     </div>
                  )}
                   <button 
                      className={`mt-6 py-2 px-4 rounded-lg border border-dashed flex items-center justify-center text-sm ${darkMode ? 'border-gray-600 text-gray-400 hover:border-gray-500' : 'border-gray-300 text-gray-600 hover:border-gray-400'}`}
                      onClick={() => {
                        setNewTask({...newTask, assignee: currentMember.name});
                        setShowAddTask(true);
                      }}
                    >
                      <Plus size={14} className="mr-1" /> Assign New Task to {currentMember.name}
                    </button>
                </>
              );
            })()}
          </div>
        )}
        
        {/* Executives Tab Content */}
        {activeTab === 'executives' && (
          <div className="flex-1 p-6 overflow-auto">
            <h2 className="text-2xl font-bold mb-6 flex items-center">
              <Briefcase size={24} className="mr-3 text-purple-400" />
              Executive Tasks
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {data.executives.map(executive => (
                <div key={executive.id} className={`rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-md p-4`}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                      <div className={`w-2 h-8 rounded-full bg-gradient-to-b ${getTeamMemberColor(executive.name)} mr-3`}></div>
                      <h3 className="text-lg font-semibold">{executive.name}</h3>
                    </div>
                    <button 
                      className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center text-sm"
                      onClick={() => {
                        setNewTask({
                          ...newTask,
                          category: 'executives',
                          for: executive.name,
                          assignee: '' // Reset assignee to allow selection
                        });
                        setShowAddTask(true);
                      }}
                    >
                      <Plus size={14} className="mr-1" /> Add Task
                    </button>
                  </div>
                  <div className="space-y-3">
                    {data.tasks
                      .filter(task => task.for === executive.name && task.category === 'executives')
                      .map(task => (
                        <div key={task.id} className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'} flex items-center`}>
                          <div className="flex-1">
                            <div className="font-medium">{task.title}</div>
                            {task.description && <div className="text-sm text-gray-400 mt-1">{task.description}</div>}
                            <div className="text-xs text-gray-500 mt-2">
                              <div className="flex items-center">
                                <div className={`w-3 h-3 rounded-full bg-gradient-to-r ${getTeamMemberColor(task.assignee)} mr-2`}></div>
                                <span>Assigned to: {task.assignee}</span>
                              </div>
                              <div className="mt-1">
                                Due: {task.dueDate}
                                <span className={`ml-2 px-2 py-1 rounded-full text-xs ${
                                  task.priority === 'high' ? 'bg-rose-900 text-rose-300' :
                                  task.priority === 'medium' ? 'bg-amber-900 text-amber-300' :
                                  'bg-blue-900 text-blue-300'
                                }`}>
                                  {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex space-x-2">
                            <button 
                              className="text-gray-400 hover:text-blue-400 transition-colors"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setEditingTask({ ...task });
                              }}
                            >
                              <Edit2 size={16} />
                            </button>
                            <button 
                              className="text-gray-400 hover:text-rose-400 transition-colors"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                if (window.confirm('Are you sure you want to delete this task?')) {
                                  handleDeleteTask(task.id);
                                }
                              }}
                            >
                              <X size={16} />
                            </button>
                          </div>
                        </div>
                      ))}
                    {data.tasks.filter(task => task.for === executive.name && task.category === 'executives').length === 0 && (
                      <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'} text-gray-500 text-center`}>
                        No tasks assigned
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Region Managers Tab Content */}
        {activeTab === 'managers' && (
          <div className="flex-1 p-6 overflow-auto">
            <h2 className="text-2xl font-bold mb-6 flex items-center">
              <Building2 size={24} className="mr-3 text-emerald-400" />
              Region Manager Tasks
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {data.regionManagers.map(manager => (
                <div key={manager.id} className={`rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-md p-4`}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                      <div className={`w-2 h-8 rounded-full bg-gradient-to-b ${getTeamMemberColor(manager.name)} mr-3`}></div>
                      <h3 className="text-lg font-semibold">{manager.name}</h3>
                    </div>
                    <button 
                      className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center text-sm"
                      onClick={() => {
                        setNewTask({
                          ...newTask,
                          category: 'regionmanagers',
                          for: manager.name,
                          assignee: '' // Reset assignee to allow selection
                        });
                        setShowAddTask(true);
                      }}
                    >
                      <Plus size={14} className="mr-1" /> Add Task
                    </button>
                  </div>
                  <div className="space-y-3">
                    {data.tasks
                      .filter(task => task.for === manager.name && task.category === 'regionmanagers')
                      .map(task => (
                        <div key={task.id} className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'} flex items-center`}>
                          <div className="flex-1">
                            <div className="font-medium">{task.title}</div>
                            {task.description && <div className="text-sm text-gray-400 mt-1">{task.description}</div>}
                            <div className="text-xs text-gray-500 mt-2">
                              <div className="flex items-center">
                                <div className={`w-3 h-3 rounded-full bg-gradient-to-r ${getTeamMemberColor(task.assignee)} mr-2`}></div>
                                <span>Assigned to: {task.assignee}</span>
                              </div>
                              <div className="mt-1">
                                Due: {task.dueDate}
                                <span className={`ml-2 px-2 py-1 rounded-full text-xs ${
                                  task.priority === 'high' ? 'bg-rose-900 text-rose-300' :
                                  task.priority === 'medium' ? 'bg-amber-900 text-amber-300' :
                                  'bg-blue-900 text-blue-300'
                                }`}>
                                  {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex space-x-2">
                            <button 
                              className="text-gray-400 hover:text-blue-400 transition-colors"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setEditingTask({ ...task });
                              }}
                            >
                              <Edit2 size={16} />
                            </button>
                            <button 
                              className="text-gray-400 hover:text-rose-400 transition-colors"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                if (window.confirm('Are you sure you want to delete this task?')) {
                                  handleDeleteTask(task.id);
                                }
                              }}
                            >
                              <X size={16} />
                            </button>
                          </div>
                        </div>
                      ))}
                    {data.tasks.filter(task => task.for === manager.name && task.category === 'regionmanagers').length === 0 && (
                      <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'} text-gray-500 text-center`}>
                        No tasks assigned
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Add Task Modal */}
        {showAddTask && (
          <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
            <div className={`rounded-lg shadow-xl w-full max-w-md mx-4 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold">Add New Task</h2>
                  <button 
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    onClick={handleCloseAddTask}
                  >
                    <X size={20} />
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Title</label>
                    <input 
                      className={`w-full px-3 py-2 border rounded-lg ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'} focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                      value={newTask.title}
                      onChange={(e) => setNewTask({...newTask, title: e.target.value})}
                      placeholder="Task title"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">Description</label>
                    <textarea 
                      className={`w-full px-3 py-2 border rounded-lg ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'} focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                      value={newTask.description}
                      onChange={(e) => setNewTask({...newTask, description: e.target.value})}
                      rows={3}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Category</label>
                      <div className="relative">
                        <select 
                          className={`w-full appearance-none px-3 py-2 border rounded-lg ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'} focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                          value={newTask.category}
                          onChange={handleCategoryChange}
                        >
                          <optgroup label="Types">
                            <option value="executives">Executives</option>
                            <option value="regionmanagers">Region Managers</option>
                            <option value="branchmanagers">Branch Managers</option>
                            <option value="burningissues">Burning Issues</option>
                            <option value="projects">Ongoing Projects</option>
                          </optgroup>
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-1">Status</label>
                      <div className="relative">
                        <select 
                          className={`w-full appearance-none px-3 py-2 border rounded-lg ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'} focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                          value={newTask.status}
                          onChange={(e) => setNewTask({...newTask, status: e.target.value})}
                          disabled={newTask.category === 'ongoingprojects'}
                        >
                          {data.columns.map(column => (
                            <option key={column.id} value={column.id}>{column.title}</option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Assignee</label>
                      <div className="relative">
                        <select 
                          className={`w-full appearance-none px-3 py-2 border rounded-lg ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'} focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                          value={newTask.assignee}
                          onChange={(e) => setNewTask({...newTask, assignee: e.target.value})}
                        >
                          <option value="">Select Assignee</option>
                          {data.teamMembers.map(member => (
                            <option key={member.id} value={member.name}>{member.name}</option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-1">For</label>
                      <div className="relative">
                        {newTask.category === 'branchmanagers' ? (
                          <input
                            type="text"
                            className={`w-full px-3 py-2 border rounded-lg ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'} focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                            value={newTask.for}
                            onChange={(e) => setNewTask({...newTask, for: e.target.value})}
                            placeholder="Enter branch manager name"
                          />
                        ) : (
                          <select 
                            className={`w-full appearance-none px-3 py-2 border rounded-lg ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'} focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                            value={newTask.for}
                            onChange={(e) => setNewTask({...newTask, for: e.target.value})}
                          >
                            <option value="">Select Person</option>
                            {newTask.category === 'executives' && data.executives.map(exec => (
                              <option key={exec.id} value={exec.name}>{exec.name}</option>
                            ))}
                            {newTask.category === 'regionmanagers' && data.regionManagers.map(manager => (
                              <option key={manager.id} value={manager.name}>{manager.name}</option>
                            ))}
                            {newTask.category === 'burningissues' && (
                              <>
                                <optgroup label="Executives">
                                  {data.executives.map(exec => (
                                    <option key={exec.id} value={exec.name}>{exec.name}</option>
                                  ))}
                                </optgroup>
                                <optgroup label="Region Managers">
                                  {data.regionManagers.map(manager => (
                                    <option key={manager.id} value={manager.name}>{manager.name}</option>
                                  ))}
                                </optgroup>
                              </>
                            )}
                            {newTask.category === 'projects' && (
                              <>
                                <optgroup label="Executives">
                                  {data.executives.map(exec => (
                                    <option key={exec.id} value={exec.name}>{exec.name}</option>
                                  ))}
                                </optgroup>
                                <optgroup label="Region Managers">
                                  {data.regionManagers.map(manager => (
                                    <option key={manager.id} value={manager.name}>{manager.name}</option>
                                  ))}
                                </optgroup>
                              </>
                            )}
                          </select>
                        )}
                        {!['branchmanagers'].includes(newTask.category) && (
                          <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Priority</label>
                      <div className="relative">
                        <select 
                          className={`w-full appearance-none px-3 py-2 border rounded-lg ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'} focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                          value={newTask.priority}
                          onChange={(e) => setNewTask({...newTask, priority: e.target.value})}
                        >
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-1">Due Date</label>
                      <input 
                        type="date"
                        className={`w-full px-3 py-2 border rounded-lg ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'} focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                        value={newTask.dueDate}
                        onChange={(e) => setNewTask({...newTask, dueDate: e.target.value})}
                      />
                    </div>
                  </div>
                </div>
                
                <div className="mt-6 flex justify-end">
                  <button 
                    className={`px-4 py-2 rounded-lg mr-2 ${darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'} transition-colors`}
                    onClick={handleCloseAddTask}
                  >
                    Cancel
                  </button>
                  <button 
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg flex items-center hover:bg-indigo-700 transition-colors"
                    onClick={handleAddTask}
                  >
                    <Check size={16} className="mr-2" /> Add Task
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Edit Task Modal */}
        {editingTask && (
          <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
            <div className={`rounded-lg shadow-xl w-full max-w-md mx-4 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold">Edit Task</h2>
                  <button 
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    onClick={() => setEditingTask(null)}
                  >
                    <X size={20} />
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Title</label>
                    <input 
                      className={`w-full px-3 py-2 border rounded-lg ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'} focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                      value={editingTask.title}
                      onChange={(e) => setEditingTask({...editingTask, title: e.target.value})}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">Description</label>
                    <textarea 
                      className={`w-full px-3 py-2 border rounded-lg ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'} focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                      value={editingTask.description}
                      onChange={(e) => setEditingTask({...editingTask, description: e.target.value})}
                      rows={3}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Category</label>
                      <div className="relative">
                        <select 
                          className={`w-full appearance-none px-3 py-2 border rounded-lg ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'} focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                          value={editingTask.category}
                          onChange={(e) => setEditingTask({...editingTask, category: e.target.value})}
                        >
                          {data.categories.map(category => (
                            <option key={category.id} value={category.id}>{category.title}</option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-1">Status</label>
                      <div className="relative">
                        <select 
                          className={`w-full appearance-none px-3 py-2 border rounded-lg ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'} focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                          value={editingTask.status}
                          onChange={(e) => setEditingTask({...editingTask, status: e.target.value})}
                        >
                          {data.columns.map(column => (
                            <option key={column.id} value={column.id}>{column.title}</option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Assignee</label>
                      <div className="relative">
                        <select 
                          className={`w-full appearance-none px-3 py-2 border rounded-lg ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'} focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                          value={editingTask.assignee}
                          onChange={(e) => setEditingTask({...editingTask, assignee: e.target.value})}
                        >
                          <option value="">Unassigned</option>
                          {data.teamMembers.map(member => (
                            <option key={member.id} value={member.name}>{member.name}</option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-1">Priority</label>
                      <div className="relative">
                        <select 
                          className={`w-full appearance-none px-3 py-2 border rounded-lg ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'} focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                          value={editingTask.priority}
                          onChange={(e) => setEditingTask({...editingTask, priority: e.target.value})}
                        >
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">Due Date</label>
                    <input 
                      type="date"
                      className={`w-full px-3 py-2 border rounded-lg ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'} focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                      value={editingTask.dueDate}
                      onChange={(e) => setEditingTask({...editingTask, dueDate: e.target.value})}
                    />
                  </div>
                </div>
                
                <div className="mt-6 flex justify-end">
                  <button 
                    className={`px-4 py-2 rounded-lg mr-2 ${darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'} transition-colors`}
                    onClick={() => setEditingTask(null)}
                  >
                    Cancel
                  </button>
                  <button 
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg flex items-center hover:bg-indigo-700 transition-colors"
                    onClick={() => handleUpdateTask(editingTask)}
                    disabled={!editingTask.title}
                  >
                    <Check size={16} className="mr-2" /> Update Task
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Add Team Member Modal */}
        {showAddTeamMember && (
          <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
            <div className={`rounded-lg shadow-xl w-full max-w-md mx-4 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold">Add New Team Member</h2>
                  <button 
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    onClick={() => setShowAddTeamMember(false)}
                  >
                    <X size={20} />
                  </button>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Name</label>
                  <input 
                    className={`w-full px-3 py-2 border rounded-lg ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'} focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                    value={newTeamMember}
                    onChange={(e) => setNewTeamMember(e.target.value)}
                    placeholder="Enter team member name"
                  />
                </div>
                
                <div className="mt-6 flex justify-end">
                  <button 
                    className={`px-4 py-2 rounded-lg mr-2 ${darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'} transition-colors`}
                    onClick={() => setShowAddTeamMember(false)}
                  >
                    Cancel
                  </button>
                  <button 
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg flex items-center hover:bg-indigo-700 transition-colors"
                    onClick={handleAddTeamMember}
                    disabled={!newTeamMember.trim()}
                  >
                    <Check size={16} className="mr-2" /> Add Member
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 