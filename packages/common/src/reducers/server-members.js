import { createSelector } from "reselect";
import { mapValues, omitKeys } from "../utils/object";
import { indexBy, groupBy, unique } from "../utils/array";
import combineReducers from "../utils/combine-reducers";
import { arrayShallowEquals } from "../utils/reselect";
import { build as buildProfilePicture } from "../utils/profile-pictures";
import { selectUser, selectUsers } from "./users";

const entriesById = (state = {}, action) => {
  switch (action.type) {
    case "initial-data-request-successful": {
      const members = action.data.servers.flatMap((s) => s.members);
      return indexBy((m) => m.id, members);
    }

    case "server-event:server-member-joined":
      return {
        ...state,
        [action.data.member.id]: action.data.member,
      };

    case "server-event:server-member-profile-updated":
      return {
        ...state,
        [action.data.member]: {
          ...state[action.data.member],
          ...omitKeys(["user"], action.data),
        },
      };

    case "logout":
      return {};

    default:
      return state;
  }
};

// TODO Remove when we memoize selectors, this is error prone, only for performance
const memberIdsByServerId = (state = [], action) => {
  switch (action.type) {
    case "initial-data-request-successful": {
      const members = action.data.servers.flatMap((s) => s.members);
      const memberIdsByServerId = mapValues(
        (members) => members.map((m) => m.id),
        groupBy((m) => m.server, members)
      );

      return memberIdsByServerId;
    }

    case "server-event:server-member-joined": {
      const serverId = action.data.member.server;
      const serverMembers = state[serverId] ?? [];
      return {
        ...state,
        [serverId]: unique([...serverMembers, action.data.member.id]),
      };
    }

    case "logout":
      return {};

    default:
      return state;
  }
};

// TODO Remove when we memoize selectors, this is error prone, only for performance
const memberIdsByUserId = (state = [], action) => {
  switch (action.type) {
    case "initial-data-request-successful": {
      const members = action.data.servers.flatMap((s) => s.members);
      const membersByUserId = groupBy((m) => m.user, members);
      const memberIdsByUserId = mapValues(
        (members) => members.map((m) => m.id),
        membersByUserId
      );

      return memberIdsByUserId;
    }

    case "server-event:server-member-joined": {
      const userId = action.data.user.id;
      const userMembers = state[userId] ?? [];
      return {
        ...state,
        [userId]: unique([...userMembers, action.data.member.id]),
      };
    }

    case "logout":
      return {};

    default:
      return state;
  }
};

export const selectServerChannelMembers = (state, channelId) => {
  const channel = state.channels.entriesById[channelId];
  return selectServerMembers(state, channel.serverId);
};

const selectDmChannelMembers = createSelector(
  (state, channelId) => {
    const channel = state.channels.entriesById[channelId];
    return selectUsers(state, channel.memberUserIds);
  },
  (members) => members,
  { memoizeOptions: { equalityCheck: arrayShallowEquals } }
);

export const selectChannelMembers = (state, channelId) => {
  const channel = state.channels.entriesById[channelId];
  if (channel == null) return [];
  return ["dm", "topic"].includes(channel.kind)
    ? selectDmChannelMembers(state, channelId)
    : selectServerChannelMembers(state, channelId);
};

export const selectChannelMember = createSelector(
  (state, channelId, userId) => {
    const channel = state.channels.entriesById[channelId];
    return ["dm", "topic"].includes(channel.kind)
      ? selectUser(state, userId)
      : selectServerMemberWithUserId(state, channel.serverId, userId);
  },
  (member) => member,
  { memoizeOptions: { maxSize: 1000 } }
);

export const selectServerMember = createSelector(
  (state, memberId) => state.serverMembers.entriesById[memberId],
  (state, memberId) => {
    const serverMember = state.serverMembers.entriesById[memberId];
    return selectUser(state, serverMember.user);
  },
  (member, user) => {
    const displayName =
      member.display_name != null && member.display_name !== ""
        ? member.display_name
        : user.displayName;

    const pfp = member.pfp ?? user.pfp;

    return {
      ...user,
      serverId: member.server,
      joinedAt: member.joined_at,
      displayName,
      profilePicture: buildProfilePicture(pfp),
    };
  },
  { memoizeOptions: { maxSize: 1000 } }
);

export const selectServerMembers = createSelector(
  (state, serverId) => {
    const serverMemberIds =
      state.serverMembers.memberIdsByServerId[serverId] ?? [];
    return serverMemberIds
      .map((id) => selectServerMember(state, id))
      .filter(Boolean);
  },
  (members) => members,
  { memoizeOptions: { equalityCheck: arrayShallowEquals } }
);

export const selectServerMemberWithUserId = createSelector(
  (state, serverId, userId) => {
    const userMemberIds = state.serverMembers.memberIdsByUserId[userId] ?? [];
    const userServerMembers = userMemberIds.map((memberId) =>
      selectServerMember(state, memberId)
    );
    return userServerMembers.find((m) => m.serverId === serverId);
  },
  (member) => member,
  { memoizeOptions: { maxSize: 1000 } }
);

export default combineReducers({
  entriesById,
  memberIdsByServerId,
  memberIdsByUserId,
});
