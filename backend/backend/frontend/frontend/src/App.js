import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Calendar, Clock, User, BarChart3, CheckCircle, AlertCircle } from 'lucide-react';

const API_BASE = process.env.REACT_APP_BACKEND_URL;

function App() {
  const [currentView, setCurrentView] = useState('dashboard');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [personalInfoCompleted, setPersonalInfoCompleted] = useState(false);
  const [completionStatus, setCompletionStatus] = useState([]);
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      // Check personal info completion
      const personalResponse = await axios.get(`${API_BASE}/api/personal-info`);
      setPersonalInfoCompleted(personalResponse.data.completed);

      // Load completion status
      const statusResponse = await axios.get(`${API_BASE}/api/completion-status`);
      setCompletionStatus(statusResponse.data.completion_status);

      // Load insights
      const insightsResponse = await axios.get(`${API_BASE}/api/insights`);
      setInsights(insightsResponse.data.insights);
    } catch (error) {
      console.error('Error loading initial data:', error);
    }
  };

  const refreshData = async () => {
    await loadInitialData();
  };

  const analyzeData = async () => {
    setLoading(true);
    try {
      const response = await axios.post(`${API_BASE}/api/analyze`, {
        include_personal_info: true
      });
      setInsights(response.data.insights);
    } catch (error) {
      console.error('Error analyzing data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTodayStatus = () => {
    const today = new Date().toISOString().split('T')[0];
    const todayStatus = completionStatus.find(status => status.date === today);
    return todayStatus || {
      date: today,
      personal_info_completed: personalInfoCompleted,
      time_log_completed: false,
      journal_completed: false
    };
  };

  const getCompletedDays = () => {
    return completionStatus.filter(status => 
      status.time_log_completed && status.journal_completed
    ).length;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                🌀 The Life Audit
              </h1>
              <p className="text-sm text-gray-600">Stage One: Awareness & Reflection</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600">
                Days completed: <span className="font-semibold text-blue-600">{getCompletedDays()}/30</span>
              </div>
              <button
                onClick={analyzeData}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-md transition duration-200 flex items-center space-x-2"
              >
                <BarChart3 size={16} />
                <span>{loading ? 'Analyzing...' : 'Analyze'}</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            <button
              onClick={() => setCurrentView('dashboard')}
              className={`py-4 px-2 border-b-2 font-medium text-sm ${
                currentView === 'dashboard'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <div className="flex items-center space-x-2">
                <BarChart3 size={16} />
                <span>Dashboard</span>
              </div>
            </button>
            
            <button
              onClick={() => setCurrentView('personal-info')}
              className={`py-4 px-2 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                currentView === 'personal-info'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <User size={16} />
              <span>Personal Info</span>
              {personalInfoCompleted && (
                <CheckCircle size={14} className="text-green-500" />
              )}
            </button>
            
            <button
              onClick={() => setCurrentView('time-log')}
              className={`py-4 px-2 border-b-2 font-medium text-sm ${
                currentView === 'time-log'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Clock size={16} />
                <span>Daily Time Log</span>
                {getTodayStatus().time_log_completed && (
                  <CheckCircle size={14} className="text-green-500" />
                )}
              </div>
            </button>
            
            <button
              onClick={() => setCurrentView('journal')}
              className={`py-4 px-2 border-b-2 font-medium text-sm ${
                currentView === 'journal'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Calendar size={16} />
                <span>Daily Journal</span>
                {getTodayStatus().journal_completed && (
                  <CheckCircle size={14} className="text-green-500" />
                )}
              </div>
            </button>
            
            <button
              onClick={() => setCurrentView('insights')}
              className={`py-4 px-2 border-b-2 font-medium text-sm ${
                currentView === 'insights'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <div className="flex items-center space-x-2">
                <AlertCircle size={16} />
                <span>Insights</span>
                {insights.length > 0 && (
                  <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                    {insights.length}
                  </span>
                )}
              </div>
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {currentView === 'dashboard' && (
          <Dashboard 
            completionStatus={completionStatus}
            insights={insights}
            personalInfoCompleted={personalInfoCompleted}
            onViewChange={setCurrentView}
          />
        )}
        
        {currentView === 'personal-info' && (
          <PersonalInfoForm 
            onComplete={refreshData}
            isCompleted={personalInfoCompleted}
          />
        )}
        
        {currentView === 'time-log' && (
          <DailyTimeLogForm 
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
            onComplete={refreshData}
          />
        )}
        
        {currentView === 'journal' && (
          <DailyJournalForm 
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
            onComplete={refreshData}
          />
        )}
        
        {currentView === 'insights' && (
          <InsightsView 
            insights={insights}
            onRefresh={analyzeData}
            loading={loading}
          />
        )}
      </main>
    </div>
  );
}

// Dashboard Component
const Dashboard = ({ completionStatus, insights, personalInfoCompleted, onViewChange }) => {
  const getCompletedDays = () => {
    return completionStatus.filter(status => 
      status.time_log_completed && status.journal_completed
    ).length;
  };

  const getCompletionPercentage = () => {
    const completed = getCompletedDays();
    return Math.round((completed / 30) * 100);
  };

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Welcome to Your Life Audit Journey
        </h1>
        <p className="text-lg text-gray-600 max-w-3xl mx-auto">
          Track your progress through 30 days of deep self-reflection and daily awareness. 
          Complete your personal information form once, then log your daily experiences and insights.
        </p>
      </div>

      {/* Progress Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <BarChart3 className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Progress</p>
              <p className="text-2xl font-semibold text-gray-900">
                {getCompletionPercentage()}%
              </p>
            </div>
          </div>
          <div className="mt-4">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                style={{ width: `${getCompletionPercentage()}%` }}
              ></div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Calendar className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Days Completed</p>
              <p className="text-2xl font-semibold text-gray-900">
                {getCompletedDays()}/30
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <AlertCircle className="h-8 w-8 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Insights Generated</p>
              <p className="text-2xl font-semibold text-gray-900">
                {insights.length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Personal Information</h3>
            <User className="h-6 w-6 text-gray-400" />
          </div>
          <p className="text-gray-600 mb-4">
            {personalInfoCompleted 
              ? "✅ Completed - Your foundation is set for meaningful insights."
              : "Complete this one-time form to begin your journey."
            }
          </p>
          <button
            onClick={() => onViewChange('personal-info')}
            className={`w-full ${personalInfoCompleted ? 'bg-gray-100 hover:bg-gray-200 text-gray-800' : 'bg-blue-600 hover:bg-blue-700 text-white'} font-medium py-2 px-4 rounded-md transition duration-200`}
          >
            {personalInfoCompleted ? 'Review' : 'Complete'} Personal Info
          </button>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Today's Time Log</h3>
            <Clock className="h-6 w-6 text-gray-400" />
          </div>
          <p className="text-gray-600 mb-4">
            Track how you spend your time in 30-minute blocks throughout the day.
          </p>
          <button
            onClick={() => onViewChange('time-log')}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition duration-200"
          >
            Log Today's Time
          </button>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Daily Journal</h3>
            <Calendar className="h-6 w-6 text-gray-400" />
          </div>
          <p className="text-gray-600 mb-4">
            Reflect on your day with comprehensive morning and evening check-ins.
          </p>
          <button
            onClick={() => onViewChange('journal')}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition duration-200"
          >
            Complete Daily Journal
          </button>
        </div>
      </div>
    </div>
  );
};

// Personal Info Form Component
const PersonalInfoForm = ({ onComplete, isCompleted }) => {
  const [formData, setFormData] = useState({
    more_time_activities: ['', '', '', '', ''],
    resent_time_activities: ['', '', '', '', ''],
    love_time_activities: ['', '', '', '', ''],
    regrets: ['', '', '', '', ''],
    wishes: ['', '', '', '', ''],
    notes: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (isCompleted) {
      loadExistingData();
    }
  }, [isCompleted]);

  const loadExistingData = async () => {
    try {
      const response = await axios.get(`${API_BASE}/api/personal-info`);
      if (response.data.completed && response.data.data) {
        setFormData(response.data.data);
        setSubmitted(true);
      }
    } catch (error) {
      console.error('Error loading personal info:', error);
    }
  };

  const handleArrayChange = (field, index, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].map((item, i) => i === index ? value : item)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      await axios.post(`${API_BASE}/api/personal-info`, formData);
      setSubmitted(true);
      onComplete();
    } catch (error) {
      console.error('Error submitting personal info:', error);
      alert('Error saving form. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (submitted || isCompleted) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-green-800 mb-2">
            Personal Information Complete
          </h2>
          <p className="text-green-700 mb-4">
            Thank you for sharing your personal reflections. This one-time form provides the foundation for your life audit insights.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center space-x-3 mb-4">
          <User className="w-8 h-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900">Really Personal Information</h1>
        </div>
        <p className="text-gray-600 leading-relaxed">
          This is a one-time form designed to capture your deep personal reflections. 
          Your honest responses will help create meaningful insights throughout your 30-day journey.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Each section */}
        {[
          { key: 'more_time_activities', title: 'If I had more time I would...' },
          { key: 'resent_time_activities', title: 'I resent time spent on...' },
          { key: 'love_time_activities', title: 'I love spending time on...' },
          { key: 'regrets', title: 'My regrets...' },
          { key: 'wishes', title: 'My wishes...' }
        ].map(section => (
          <div key={section.key} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">{section.title}</h3>
            <div className="space-y-3">
              {formData[section.key].map((value, index) => (
                <input
                  key={index}
                  type="text"
                  placeholder={`Item ${index + 1}`}
                  value={value}
                  onChange={(e) => handleArrayChange(section.key, index, e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              ))}
            </div>
          </div>
        ))}

        {/* Notes */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Additional Notes</h3>
          <textarea
            placeholder="Any additional thoughts or reflections..."
            value={formData.notes}
            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-vertical h-32"
          />
        </div>

        {/* Submit */}
        <div className="flex justify-center pt-6">
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-3 px-8 rounded-lg transition-colors duration-200"
          >
            {loading ? 'Saving...' : 'Complete Personal Information Form'}
          </button>
        </div>
      </form>
    </div>
  );
};

// Simplified components for Time Log, Journal, and Insights
const DailyTimeLogForm = ({ selectedDate, onDateChange, onComplete }) => {
  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-4">Daily Time Log</h1>
      <p className="text-gray-600 mb-8">Track your time in 30-minute blocks for {selectedDate}</p>
      <div className="bg-white p-6 rounded-lg border">
        <p className="text-center text-gray-500">Time logging interface will be implemented here</p>
      </div>
    </div>
  );
};

const DailyJournalForm = ({ selectedDate, onDateChange, onComplete }) => {
  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-4">Daily Journal</h1>
      <p className="text-gray-600 mb-8">Comprehensive daily reflection for {selectedDate}</p>
      <div className="bg-white p-6 rounded-lg border">
        <p className="text-center text-gray-500">Daily journal interface will be implemented here</p>
      </div>
    </div>
  );
};

const InsightsView = ({ insights, onRefresh, loading }) => {
  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-4">AI Insights</h1>
      <p className="text-gray-600 mb-8">AI-powered analysis of your patterns and progress</p>
      <div className="bg-white p-6 rounded-lg border">
        <p className="text-center text-gray-500">
          {insights.length === 0 ? 'No insights yet - complete some forms to generate insights!' : `${insights.length} insights generated`}
        </p>
      </div>
    </div>
  );
};

export default App;
