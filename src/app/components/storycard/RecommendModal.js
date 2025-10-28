// RecommendModal.js
import React, { useState, useEffect } from 'react';
// import { userApi } from '../../../../lib/api';
import { userApi, storyApi, storiesApi } from '../../../../lib/api';

const RecommendModal = ({ 
    showRecommendModal, 
    setShowRecommendModal, 
    story,
    isAuthenticated,
    currentUser
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedUsers, setSelectedUsers] = useState([]);
    const [followers, setFollowers] = useState([]);
    const [loading, setLoading] = useState(true);
    
    useEffect(() => {
        if (showRecommendModal && isAuthenticated && currentUser) {
            fetchFollowers();
        }
    }, [showRecommendModal, isAuthenticated, currentUser]);
    
    const fetchFollowers = async () => {
        try {
            setLoading(true);
            const response = await userApi.getFollowers(currentUser.username);
            setFollowers(response || []);
        } catch (error) {
            console.error('Error fetching followers:', error);
            setFollowers([]);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectAll = (e) => {
        if (e.target.checked) {
            setSelectedUsers(followers.map(user => user.id));
        } else {
            setSelectedUsers([]);
        }
    };

    const handleRecommendSubmit = async () => {
        if (selectedUsers.length === 0) {
            alert('Please select at least one follower to recommend to');
            return;
        }
        
        try {
            // Get the usernames of selected users
            const selectedUsernames = followers
                .filter(user => selectedUsers.includes(user.id))
                .map(user => user.username);
                
            // Send recommendation to backend
            await storiesApi.recommendStory(story.slug, selectedUsernames);
            
            setShowRecommendModal(false);
            setSelectedUsers([]);
            setSearchTerm('');
            alert(`Story recommended successfully to ${selectedUsers.length} followers!`);
        } catch (error) {
            console.error('Error recommending story:', error);
            alert('Failed to recommend story. Please try again.');
        }
    };

    const filteredUsers = followers.filter(user => {
        if (!searchTerm) return true;
        const searchLower = searchTerm.toLowerCase();
        return (
            (user.name && user.name.toLowerCase().includes(searchLower)) || 
            (user.username && user.username.toLowerCase().includes(searchLower))
        );
    });

    if (!showRecommendModal) return null;

    return (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-lg z-[600] flex items-center justify-center">
            <div className="w-full max-w-5xl max-h-[95vh] bg-gradient-to-br from-gray-950 via-slate-950 to-indigo-950 rounded-3xl border border-cyan-500/40 shadow-2xl overflow-visible transform scale-100 transition-all duration-500 relative flex flex-col">
                <div className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none">
                    <div className="absolute inset-0 rounded-3xl border-2 border-cyan-500/30 animate-pulse"></div>
                    <div className="absolute inset-0 rounded-3xl border-2 border-purple-500/20 animate-pulse" style={{ animationDelay: '0.5s' }}></div>
                    <div className="absolute inset-0 rounded-3xl border-2 border-pink-500/10 animate-pulse" style={{ animationDelay: '1s' }}></div>
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-500/10 to-transparent h-px w-full animate-pulse"></div>
                </div>
                
                <div className="relative z-10 bg-gradient-to-r from-gray-950/95 to-indigo-950/95 backdrop-blur-md border-b border-cyan-500/30 px-8 py-6">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-5">
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500/30 to-blue-600/30 flex items-center justify-center shadow-lg shadow-cyan-500/40 border border-cyan-500/30">
                                <i className="fas fa-paper-plane text-cyan-400 text-2xl"></i>
                            </div>
                            <div>
                                <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500">
                                    RECOMMEND STORY
                                </h2>
                                <p className="text-gray-400 text-sm mt-1">
                                    Recommend "{story.title || 'this story'}" to your followers
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <button 
                                onClick={() => {
                                    setShowRecommendModal(false);
                                    setSearchTerm('');
                                    setSelectedUsers([]);
                                }}
                                className="w-12 h-12 rounded-full bg-gray-900/60 hover:bg-gray-800/60 flex items-center justify-center text-gray-400 hover:text-white transition-all duration-300 border border-gray-700/50 hover:border-cyan-500/50"
                            >
                                <i className="fas fa-times text-xl"></i>
                            </button>
                        </div>
                    </div>
                </div>
                
                <div className="relative z-10 p-8 overflow-y-auto flex-grow custom-scrollbar" style={{ minHeight: '0' }}>
                    <div className="max-w-5xl mx-auto space-y-8">
                        <div className="space-y-4">
                            <label className="block text-sm font-medium text-gray-300 mb-4 flex items-center gap-2">
                                <i className="fas fa-search text-purple-400"></i> Search Followers
                            </label>
                            <div className="relative">
                                <input 
                                    type="text"
                                    placeholder="Search followers..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full px-5 py-4 bg-slate-900/60 border border-gray-700 rounded-2xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/30 transition-all duration-300 text-lg"
                                />
                                <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-purple-500/5 to-indigo-500/5 opacity-0 pointer-events-none transition-opacity duration-300"></div>
                            </div>
                        </div>
                        
                        <div className="space-y-4">
                            <label className="block text-sm font-medium text-gray-300 mb-4 flex items-center gap-2">
                                <i className="fas fa-users text-purple-400"></i> Select Followers
                            </label>
                            
                            <div className="bg-slate-900/60 border border-gray-700 rounded-2xl p-4">
                                {loading ? (
                                    <div className="text-center py-8 text-gray-400">
                                        <i className="fas fa-spinner fa-spin text-3xl mb-3"></i>
                                        <p>Loading followers...</p>
                                    </div>
                                ) : followers.length === 0 ? (
                                    <div className="text-center py-8 text-gray-400">
                                        <i className="fas fa-user-slash text-3xl mb-3"></i>
                                        <p>You don't have any followers yet</p>
                                    </div>
                                ) : (
                                    <>
                                        <div className="flex items-center gap-3 p-3 hover:bg-slate-800/50 rounded-xl transition-colors mb-2">
                                            <input 
                                                type="checkbox"
                                                id="select-all"
                                                checked={selectedUsers.length === followers.length && followers.length > 0}
                                                onChange={handleSelectAll}
                                                className="w-5 h-5 text-cyan-500 rounded focus:ring-cyan-500 focus:ring-2"
                                            />
                                            <label htmlFor="select-all" className="text-white font-medium cursor-pointer flex-1">
                                                Select All ({followers.length} followers)
                                            </label>
                                        </div>
                                        
                                        <div className="max-h-60 overflow-y-auto custom-scrollbar">
                                            {filteredUsers.length > 0 ? (
                                                filteredUsers.map(user => (
                                                    <div key={user.id} className="flex items-center gap-3 p-3 hover:bg-slate-800/50 rounded-xl transition-colors">
                                                        <input 
                                                            type="checkbox" 
                                                            id={`user-${user.id}`}
                                                            checked={selectedUsers.includes(user.id)}
                                                            onChange={(e) => {
                                                                if (e.target.checked) {
                                                                    setSelectedUsers([...selectedUsers, user.id]);
                                                                } else {
                                                                    setSelectedUsers(selectedUsers.filter(id => id !== user.id));
                                                                }
                                                            }}
                                                            className="w-5 h-5 text-cyan-500 rounded focus:ring-cyan-500 focus:ring-2"
                                                        />
                                                        <label htmlFor={`user-${user.id}`} className="flex items-center gap-3 cursor-pointer flex-1">
                                                            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-cyan-500/30 to-blue-500/30 flex items-center justify-center text-white font-semibold">
                                                                {user.name ? user.name.charAt(0) : user.username.charAt(0)}
                                                            </div>
                                                            <div>
                                                                <div className="text-white font-medium">{user.name || user.username}</div>
                                                                <div className="text-gray-400 text-sm">@{user.username}</div>
                                                            </div>
                                                        </label>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="text-center py-8 text-gray-400">
                                                    <i className="fas fa-user-slash text-3xl mb-3"></i>
                                                    <p>No followers found matching "{searchTerm}"</p>
                                                </div>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                            
                            <div className="text-right">
                                <span className="text-cyan-400 font-medium">
                                    {selectedUsers.length} of {followers.length} selected
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div className="relative z-10 bg-gradient-to-r from-gray-950/95 to-indigo-950/95 backdrop-blur-md border-t border-gray-800/50 px-8 py-6" style={{ position: 'sticky', bottom: '0', zIndex: '20' }}>
                    <div className="flex justify-between">
                        <button 
                            onClick={() => {
                                setShowRecommendModal(false);
                                setSearchTerm('');
                                setSelectedUsers([]);
                            }}
                            className="px-8 py-3 bg-gray-800/60 hover:bg-gray-700/60 text-gray-300 rounded-2xl font-medium transition-all duration-300 border border-gray-700/50 hover:border-gray-600/50"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleRecommendSubmit}
                            disabled={selectedUsers.length === 0 || loading}
                            className="px-8 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white rounded-2xl font-medium flex items-center gap-3 transition-all duration-300 transform hover:scale-105 shadow-lg shadow-cyan-500/30 border border-cyan-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <i className="fas fa-paper-plane text-xl"></i>
                            Recommend to {selectedUsers.length} {selectedUsers.length === 1 ? 'Follower' : 'Followers'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RecommendModal;