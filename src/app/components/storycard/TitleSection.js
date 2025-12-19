import React, { useRef, useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
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
        // Defer truncation check to avoid blocking initial render for LCP
        const timeoutId = setTimeout(() => {
            checkTruncation();
            setIsReady(true);
        }, 0);
        
        return () => clearTimeout(timeoutId);
    }, [story.title, story.description, titleExpanded, descExpanded]);

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
                // Add text part with gradient
                if (parts[i]) {
                    result.push(
                        <span key={`text-${i}`} className="bg-gradient-to-r from-neon-blue to-neon-purple bg-clip-text text-transparent">
                            {parts[i]}
                        </span>
                    );
                }
                
                // Add emoji without gradient
                if (i < emojis.length) {
                    result.push(
                        <span key={`emoji-${i}`} className="text-3xl">
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
                <Link 
                    href={currentTag ? `/stories/${story.slug}/?tag=${encodeURIComponent(currentTag)}` : `/stories/${story.slug}/`} 
                    className="block"
                    onMouseEnter={(e) => {
                        // Prefetch the story page on hover for instant navigation
                        if (e.currentTarget.prefetch) {
                            e.currentTarget.prefetch();
                        }
                    }}
                >
                    <h2 
                        ref={titleRef}
                        className={`scene-title text-2xl md:text-3xl font-bold mb-0 hover:underline flex items-center flex-wrap ${
                            titleExpanded ? '' : 'line-clamp-2'
                        }`}
                        id={`title-${index}`}
                        onClick={(e) => {
                            if (wasTitleTruncated && !titleExpanded) {
                                e.preventDefault();
                                toggleTitle();
                            }
                        }}
                        style={{
                            display: '-webkit-box',
                            WebkitBoxOrient: 'vertical',
                            WebkitLineClamp: titleExpanded ? 'unset' : 2,
                            overflow: titleExpanded ? 'visible' : 'hidden'
                        }}
                    >
                        {renderTitleWithEmojis(story.title)}
                    </h2>
                </Link>
                
                {/* Title toggle control */}
                {wasTitleTruncated && (
                    <span 
                        className="text-cyan-400 ml-1 cursor-pointer text-sm font-medium hover:text-cyan-300 transition-colors"
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            toggleTitle();
                        }}
                    >
                        {titleExpanded ? 'Read less' : ''}
                    </span>
                )}
            </div>
            
            <div className="desc-container" id={`desc-container-${index}`}>
                <div 
                    ref={descRef}
                    className={`scene-description  ${
                        descExpanded ? '' : 'line-clamp-3'
                    }`}
                    id={`desc-${index}`}
                    style={{
                        display: '-webkit-box',
                        WebkitBoxOrient: 'vertical',
                        WebkitLineClamp: descExpanded ? 'unset' : 3,
                        overflow: descExpanded ? 'visible' : 'hidden'
                    }}
                >
                    {story.description || 'No description available.'}
                </div>
                
                {/* Description toggle control */}
                {wasDescTruncated && (
                    <span 
                        className="text-cyan-400 cursor-pointer text-sm font-medium hover:text-cyan-300 transition-colors mt-1 inline-block"
                        id={`readmore-${index}`}
                        onClick={toggleDescription}
                    >
                        {descExpanded ? 'Read less' : 'Read more'}
                    </span>
                )}
            </div>
        </>
    );
};

export default TitleSection;