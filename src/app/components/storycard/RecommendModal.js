// RecommendModal.js
import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { absoluteUrl } from '../../../../lib/api';
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
    
    const fetchFollowers = useCallback(async () => {
        if (!currentUser || !currentUser.username) {
            setLoading(false);
            return;
        }
        
        try {
            setLoading(true);
            const response = await userApi.getFollowers(currentUser.username);
            setFollowers(response || []);
        } catch (error) {
            setFollowers([]);
        } finally {
            setLoading(false);
        }
    }, [currentUser]); // Changed from currentUser.username to currentUser
    
    useEffect(() => {
        if (showRecommendModal && isAuthenticated && currentUser) {
            fetchFollowers();
        }
    }, [showRecommendModal, isAuthenticated, currentUser, fetchFollowers]);

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
        <div className="fixed inset-0 bg-black/90 backdrop-blur-lg z-[10100] flex items-center justify-center">
            <div className="w-full max-w-5xl max-h-[95vh] bg-linear-to-br from-gray-950 via-slate-950 to-indigo-950 rounded-3xl border border-cyan-500/40 shadow-2xl overflow-visible transform scale-100 transition-all duration-500 relative flex flex-col">
                <div className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none">
                    <div className="absolute inset-0 rounded-3xl border-2 border-cyan-500/30 animate-pulse"></div>
                    <div className="absolute inset-0 rounded-3xl border-2 border-purple-500/20 animate-pulse" style={{ animationDelay: '0.5s' }}></div>
                    <div className="absolute inset-0 rounded-3xl border-2 border-pink-500/10 animate-pulse" style={{ animationDelay: '1s' }}></div>
                    <div className="absolute inset-0 bg-linear-to-r from-transparent via-cyan-500/10 to-transparent h-px w-full animate-pulse"></div>
                </div>
                
                <div className="relative z-10 bg-linear-to-r from-gray-950/95 to-indigo-950/95 backdrop-blur-md border-b border-cyan-500/30 px-6 py-4">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-linear-to-br from-cyan-500/30 to-blue-600/30 flex items-center justify-center shadow-lg shadow-cyan-500/40 border border-cyan-500/30">
                                <i className="fas fa-paper-plane text-cyan-400 text-lg"></i>
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-linear-to-r from-cyan-400 via-blue-500 to-purple-500">
                                    RECOMMEND STORY
                                </h2>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button 
                                onClick={() => {
                                    setShowRecommendModal(false);
                                    setSearchTerm('');
                                    setSelectedUsers([]);
                                }}
                                className="w-9 h-9 rounded-lg bg-gray-900/60 hover:bg-gray-800/60 flex items-center justify-center text-gray-400 hover:text-white transition-all duration-300 border border-gray-700/50 hover:border-cyan-500/50"
                            >
                                <i className="fas fa-times text-sm"></i>
                            </button>
                        </div>
                    </div>
                </div>
                
                <div className="relative z-10 p-8 overflow-y-auto grow custom-scrollbar" style={{ minHeight: '0' }}>
                    <div className="max-w-5xl mx-auto space-y-8">
                        <div className="space-y-4">
                            <label className="flex text-sm font-medium text-gray-300 mb-4 items-center gap-2">
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
                                <div className="absolute inset-0 rounded-2xl bg-linear-to-r from-purple-500/5 to-indigo-500/5 opacity-0 pointer-events-none transition-opacity duration-300"></div>
                            </div>
                        </div>
                        
                        <div className="space-y-4">
                            <label className="flex text-sm font-medium text-gray-300 mb-4 items-center gap-2">
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
                                        <p>You don&apos;t have any followers yet</p>
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
                                                            {/* Using Next.js Image for optimization */}
                                                            {user.profile_image_url ? (
                                                                <Image 
                                                                    src={absoluteUrl(user.profile_image_url)}
                                                                    alt={user.name || user.username}
                                                                    width={40}
                                                                    height={40}
                                                                    className="rounded-full object-cover"
                                                                    quality={75}
                                                                />
                                                            ) : user.profile_picture ? (
                                                                <Image 
                                                                    src={absoluteUrl(user.profile_picture)}
                                                                    alt={user.name || user.username}
                                                                    width={40}
                                                                    height={40}
                                                                    className="rounded-full object-cover"
                                                                    quality={75}
                                                                />
                                                            ) : (
                                                                <div className="w-10 h-10 rounded-full bg-linear-to-r from-cyan-500/30 to-blue-500/30 flex items-center justify-center text-white font-semibold">
                                                                    {user.name ? user.name.charAt(0) : user.username.charAt(0)}
                                                                </div>
                                                            )}
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
                                                    <p>No followers found matching &ldquo;{searchTerm}&rdquo;</p>
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
                
                <div className="relative z-10 bg-linear-to-r from-gray-950/95 to-indigo-950/95 backdrop-blur-md border-t border-gray-800/50 px-3 py-6" style={{ position: 'sticky', bottom: '0', zIndex: '20' }}>
                    <div className="flex justify-between">
                        <button 
                            onClick={() => {
                                setShowRecommendModal(false);
                                setSearchTerm('');
                                setSelectedUsers([]);
                            }}
                            className="px-4 py-2 bg-gray-800/60 hover:bg-gray-700/60 text-gray-300 rounded-xl font-medium transition-all duration-300 border border-gray-700/50 hover:border-gray-600/50"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleRecommendSubmit}
                            disabled={selectedUsers.length === 0 || loading}
                            className="px-2 py-2 bg-linear-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white rounded-xl font-medium flex items-center gap-2 transition-all duration-300 transform hover:scale-105 shadow-lg shadow-cyan-500/30 border border-cyan-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <i className="fas fa-paper-plane text-sm"></i>
                            Recommend to {selectedUsers.length} {selectedUsers.length === 1 ? 'Follower' : 'Followers'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RecommendModal;