import React, { useRef, useEffect, useState, useMemo } from 'react';
import dynamic from 'next/dynamic';

const TitleSection = ({ 
    story, 
    index, 
    currentTag,
    titleExpanded, 
    descExpanded, 
    isTitleTruncated, 
    isDescTruncated,
    setTitleExpanded,
    setDescExpanded,
    setIsTitleTruncated,
    setIsDescTruncated
}) => {
    const titleRef = useRef(null);
    const descRef = useRef(null);
    const [wasTitleTruncated, setWasTitleTruncated] = useState(false);
    const [wasDescTruncated, setWasDescTruncated] = useState(false);
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        // For the first story (index 0), check truncation synchronously to avoid LCP delay
        if (index === 0) {
            checkTruncation();
            setIsReady(true);
            return;
        }
        // For other stories, defer truncation check to avoid blocking initial render
        const timeoutId = setTimeout(() => {
            checkTruncation();
            setIsReady(true);
        }, 0);
        return () => clearTimeout(timeoutId);
    }, [story.title, story.description, titleExpanded, descExpanded, index]);

    const checkTruncation = () => {
        if (titleRef.current) {
            const isTruncated = titleRef.current.scrollHeight > titleRef.current.clientHeight;
            setIsTitleTruncated(isTruncated);
            if (isTruncated && !wasTitleTruncated) {
                setWasTitleTruncated(true);
            }
        }
        
        if (descRef.current) {
            const isTruncated = descRef.current.scrollHeight > descRef.current.clientHeight;
            setIsDescTruncated(isTruncated);
            if (isTruncated && !wasDescTruncated) {
                setWasDescTruncated(true);
            }
        }
    };

    const toggleTitle = () => {
        setTitleExpanded(!titleExpanded);
    };

    const toggleDescription = () => {
        setDescExpanded(!descExpanded);
    };

    // Function to render title with emojis properly - MEMOIZED to prevent expensive regex on every render
    const renderTitleWithEmojis = useMemo(() => {
        return (title) => {
            if (!title) return 'Untitled Story';
            
            // Regular expression to match emojis
            const emojiRegex = /[\p{Emoji_Presentation}\p{Emoji}\u200D]+/gu;
            const parts = title.split(emojiRegex);
            const emojis = title.match(emojiRegex) || [];
            
            const result = [];
            for (let i = 0; i < parts.length; i++) {
                // Add text part (gradient is on the parent h2)
                if (parts[i]) {
                    result.push(
                        <span key={`text-${i}`}>
                            {parts[i]}
                        </span>
                    );
                }
                
                // Add emoji without gradient
                if (i < emojis.length) {
                    result.push(
                        <span key={`emoji-${i}`} className="text-2xl">
                            {emojis[i]}
                        </span>
                    );
                }
            }
            
            return result;
        };
    }, []);

    return (
        <>
            <div className="title-container" id={`title-container-${index}`}> 
                <h2 
                    ref={titleRef}
                    className={`scene-title text-2xl md:text-3xl font-bold mb-0 flex items-center flex-wrap cursor-pointer hover:opacity-80 transition-opacity leading-tight sm:leading-normal bg-gradient-to-r from-neon-blue to-neon-purple bg-clip-text text-transparent ${
                        titleExpanded ? '' : 'line-clamp-2'
                    }`}
                    id={`title-${index}`}
                    onClick={(e) => {
                        e.preventDefault();
                        if (wasTitleTruncated) {
                            toggleTitle();
                        }
                    }}
                    style={index === 0 ? {
                        // For the first story, render synchronously for LCP
                        display: '-webkit-box',
                        WebkitBoxOrient: 'vertical',
                        WebkitLineClamp: titleExpanded ? 'unset' : 2,
                        overflow: titleExpanded ? 'visible' : 'hidden',
                        containIntrinsicSize: 'auto 2em',
                    } : {
                        display: '-webkit-box',
                        WebkitBoxOrient: 'vertical',
                        WebkitLineClamp: titleExpanded ? 'unset' : 2,
                        overflow: titleExpanded ? 'visible' : 'hidden'
                    }}
                >
                    {renderTitleWithEmojis(story.title)}
                </h2>
                {wasTitleTruncated && titleExpanded && (
                    <span 
                        className="text-cyan-400 ml-1 cursor-pointer text-sm font-medium hover:text-cyan-300 transition-colors"
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            toggleTitle();
                        }}
                    >
                        Read less
                    </span>
                )}
            </div>
            <div className="desc-container" id={`desc-container-${index}`}> 
                {index === 0 ? (
                    <div
                        className="scene-description line-clamp-3 leading-none sm:leading-tight cursor-pointer hover:opacity-80 transition-opacity"
                        id={`desc-${index}`}
                        style={{
                            display: '-webkit-box',
                            WebkitBoxOrient: 'vertical',
                            WebkitLineClamp: 3,
                            overflow: 'hidden',
                            containIntrinsicSize: 'auto 3em',
                        }}
                    >
                        {story.description || 'No description available.'}
                    </div>
                ) : (
                    <>
                        <div 
                            ref={descRef}
                            className={`scene-description leading-none sm:leading-tight cursor-pointer hover:opacity-80 transition-opacity ${
                                descExpanded ? '' : 'line-clamp-3'
                            }`}
                            id={`desc-${index}`}
                            onClick={() => {
                                if (wasDescTruncated) {
                                    toggleDescription();
                                }
                            }}
                            style={{
                                display: '-webkit-box',
                                WebkitBoxOrient: 'vertical',
                                WebkitLineClamp: descExpanded ? 'unset' : 3,
                                overflow: descExpanded ? 'visible' : 'hidden'
                            }}
                        >
                            {story.description || 'No description available.'}
                        </div>
                        {wasDescTruncated && descExpanded && (
                            <span 
                                className="text-cyan-400 cursor-pointer text-sm font-medium hover:text-cyan-300 transition-colors mt-1 inline-block"
                                id={`readmore-${index}`}
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    toggleDescription();
                                }}
                            >
                                Read less
                            </span>
                        )}
                    </>
                )}
            </div>
        </>
    );
};

export default TitleSection;