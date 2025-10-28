import React, { useRef, useEffect } from 'react';

const TitleSection = ({ 
    story, 
    index, 
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

    useEffect(() => {
        checkTruncation();
    }, [story.title, story.description, titleExpanded, descExpanded]);

    const checkTruncation = () => {
        if (titleRef.current) {
            const isTruncated = titleRef.current.scrollHeight > titleRef.current.clientHeight;
            setIsTitleTruncated(isTruncated);
        }
        
        if (descRef.current) {
            const isTruncated = descRef.current.scrollHeight > descRef.current.clientHeight;
            setIsDescTruncated(isTruncated);
        }
    };

    const toggleTitle = () => {
        setTitleExpanded(!titleExpanded);
    };

    const toggleDescription = () => {
        setDescExpanded(!descExpanded);
    };

    // Function to render title with emojis properly
    const renderTitleWithEmojis = (title) => {
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

    return (
        <>
            <div className="title-container" id={`title-container-${index}`}>
                <a href={`/stories/${story.slug}/`} className="block">
                    <h2 
                        ref={titleRef}
                        className={`scene-title text-3xl font-bold mb-2.5 hover:underline flex items-center flex-wrap ${
                            titleExpanded ? '' : 'line-clamp-2'
                        }`}
                        id={`title-${index}`}
                    >
                        {renderTitleWithEmojis(story.title)}
                    </h2>
                </a>
                {isTitleTruncated && (
                    <span 
                        className="title-read-more" 
                        id={`title-readmore-${index}`}
                        onClick={toggleTitle}
                    >
                        {titleExpanded ? 'Read less' : 'Read more'}
                    </span>
                )}
            </div>
            
            <div className="desc-container" id={`desc-container-${index}`}>
                <div 
                    ref={descRef}
                    className={`scene-description ${
                        descExpanded ? '' : 'line-clamp-3'
                    }`}
                    id={`desc-${index}`}
                >
                    {story.description || 'No description available.'}
                </div>
                {isDescTruncated && (
                    <span 
                        className="read-more-btn" 
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