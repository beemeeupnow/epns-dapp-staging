/**
 * This file helps us maintain the channels fetched in state, such that when we leave the tab, the channels can be fetched from memory
 */
import { createSlice } from "@reduxjs/toolkit";

const initialState = {
    CHANNNEL_DEACTIVATED_STATE: 2,
    CHANNEL_BLOCKED_STATE: 3,
    CHANNEL_ACTIVE_STATE: 1,
    CHANNEL_BLACKLIST: [], //a list of channels
    page: 0,
    channels: [], // the channels meta-data
    channelsCache: {}, // a mapping of channel address to channel details
};

export const contractSlice = createSlice({
    name: "channels",
    initialState,
    reducers: {
        setChannelMeta: (state, action) => {
            state.channels = action.payload;
        },
        incrementPage: (state) => {
            state.page += 1;
        },
        cacheChannelInfo: (state, action) => {
            const { address, meta } = action.payload;
            state.channelsCache[address] = meta;
        },
        subscribeChannel: (state, action) => {
            const { address } = action.payload;
            let channelIndex;
            state.channels.find((channel, index) => {
                if (channel.addr === address) {
                    channelIndex = index;
                    return true;
                }
            });
            state.channels[channelIndex].isSubscriber = true;
            state.channels[channelIndex].memberCount++;
        },
        unsubscribeChannel: (state, action) => {
            const { address } = action.payload;
            let channelIndex;
            state.channels.find((channel, index) => {
                if (channel.addr === address) {
                    channelIndex = index;
                    return true;
                }
            });
            state.channels[channelIndex].isSubscriber = false;
            state.channels[channelIndex].memberCount--;
        },
    },
});

// Action creators are generated for each case reducer function
export const {
    setChannelMeta,
    incrementPage,
    cacheChannelInfo,
    subscribeChannel,
    unsubscribeChannel,
} = contractSlice.actions;

export default contractSlice.reducer;
