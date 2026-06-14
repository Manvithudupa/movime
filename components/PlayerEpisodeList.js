"use client"
import React, { useEffect } from 'react';

// Simplified PlayerEpisodeList for FlixHQ movie/TV integration
// This component is used by PlayerComponent but for FlixHQ we don't need complex episode management
function PlayerEpisodeList({ data, setwatchepdata, epnum }) {
    useEffect(() => {
        // Set basic episode data structure for FlixHQ
        if (data && data.type === 'TV' && data.providerEpisodes) {
            // Format FlixHQ episodes for the player
            const formattedEpisodes = data.providerEpisodes.map((ep) => ({
                number: ep.episodeNumber,
                title: ep.title || `Episode ${ep.episodeNumber}`,
                episodeId: ep.episodeId,
                seasonNumber: ep.seasonNumber,
            }));
            setwatchepdata(formattedEpisodes);
        } else if (data && data.type === 'Movie') {
            // For movies, create a single episode entry
            setwatchepdata([{
                number: 1,
                title: data.name || 'Movie',
                episodeId: data.id,
            }]);
        }
    }, [data, setwatchepdata]);

    // For FlixHQ integration, episode selection is handled by the watch page
    // This component just provides episode data to PlayerComponent
    return (
        <div className="w-full">
            <div className="text-gray-400 text-sm p-4 bg-gray-800/30 rounded">
                {data?.type === 'TV' && data?.providerEpisodes ? (
                    <div>
                        <p className="font-semibold text-white mb-2">Episode {epnum}</p>
                        <p className="text-xs text-gray-500">
                            {data.providerEpisodes.length} episodes available
                        </p>
                    </div>
                ) : data?.type === 'Movie' ? (
                    <div>
                        <p className="font-semibold text-white">{data.name || 'Movie'}</p>
                        <p className="text-xs text-gray-500">FlixHQ Source</p>
                    </div>
                ) : (
                    <p className="text-xs text-gray-500">Loading episode information...</p>
                )}
            </div>
        </div>
    );
}

export default PlayerEpisodeList;
