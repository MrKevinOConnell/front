import { createSelector } from "reselect";
import combineReducers from "../utils/combine-reducers";
import { indexBy, sort } from "../utils/array";
import { arrayShallowEquals } from "../utils/reselect";

const entriesById = (state = {}, action) => {
  switch (action.type) {
    case "initial-data-request-successful": {
      const sections = action.data.servers.flatMap((s) =>
        s.sections.map((section) => ({ ...section, serverId: s.id }))
      );

      return indexBy((s) => s.id, sections);
    }

    case "logout":
      return {};

    default:
      return state;
  }
};

export const selectServerChannelSections = createSelector(
  (state, serverId) => {
    const sections = Object.values(state.channelSections.entriesById).filter(
      (s) => s.serverId === serverId
    );
    const unsortedSections = sections.map((s) => ({
      id: s.id,
      name: s.name,
      position: s.position,
      channelIds: s.channels,
    }));

    return sort((s1, s2) => {
      const [p1, p2] = [s1, s2].map((s) => s.position);
      if (p1 > p2) return 1;
      if (p1 < p2) return -1;
      return 0;
    }, unsortedSections);
  },
  (sections) => sections,
  { memoizeOptions: { equalityCheck: arrayShallowEquals } }
);

export const selectChannelSectionWithChild = (state, childChannelId) => {
  const channel = state.channels.entriesById[childChannelId];
  const sections = selectServerChannelSections(state, channel.serverId);
  return sections.find((s) => s.channelIds.includes(childChannelId));
};

export default combineReducers({ entriesById });
