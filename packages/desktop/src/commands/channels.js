import { getChecksumAddress } from "../utils/ethereum";

const commands = {
  "create-channel": ({
    context,
    user,
    state,
    actions,
    serverId,
    navigate,
  }) => ({
    description: "Create a new channel",
    arguments: ["name"],
    execute: async ({ args, editor }) => {
      const name = args.join(" ");
      if (name.trim().length === 0) {
        alert('"name" is a required argument!');
        return;
      }
      const channel = await actions.createServerChannel(serverId, { name });
      editor.clear();
      navigate(`/channels/${serverId}/${channel.id}`);
    },
    exclude: () => {
      if (context != "server-channel") return true;
      const server = state.selectServer(serverId);
      return server?.ownerUserId !== user.id;
    },
  }),
  "rename-channel": ({
    context,
    user,
    state,
    actions,
    serverId,
    channelId,
  }) => ({
    description: "Set a new name for this channel",
    arguments: ["channel-name"],
    execute: async ({ args, editor }) => {
      if (args.length < 1) {
        alert('Argument "channel-name" is required');
        return;
      }
      const channelName = args.join(" ");
      await actions.updateChannel(channelId, { name: channelName });
      editor.clear();
    },
    exclude: () => {
      if (context === "dm") {
        const channel = state.selectChannel(channelId);
        return user.id !== channel.ownerUserId;
      }

      const server = state.selectServer(serverId);
      return server?.ownerUserId !== user.id;
    },
  }),
  "delete-channel": ({
    context,
    user,
    state,
    actions,
    navigate,
    serverId,
    channelId,
  }) => ({
    description: "Delete the current channel",
    execute: async ({ editor }) => {
      if (!confirm("Are you sure you want to delete this channel?")) return;
      await actions.deleteChannel(channelId);
      editor.clear();
      navigate(`/channels/${serverId}`);
    },
    exclude: () => {
      if (context === "dm") {
        const channel = state.selectChannel(channelId);
        return user.id !== channel.ownerUserId;
      }

      const server = state.selectServer(serverId);
      return server?.ownerUserId !== user.id;
    },
  }),
  "update-channel": ({
    context,
    user,
    state,
    actions,
    serverId,
    channelId,
  }) => ({
    description: "Update a channel property",
    arguments: ["propery-name", "property-value"],
    execute: async ({ args, editor }) => {
      if (args.length < 2) {
        alert('Arguments #1 "property", and #2 "value", are required.');
        return;
      }
      const [property, ...valueWords] = args;
      const value = valueWords.join(" ");
      await actions.updateChannel(channelId, { [property]: value });
      editor.clear();
    },
    exclude: () => {
      if (!location.search.includes("root")) return true;

      if (context === "dm") {
        const channel = state.selectChannel(channelId);
        return user.id !== channel.ownerUserId;
      }

      const server = state.selectServer(serverId);
      return server?.ownerUserId !== user.id;
    },
  }),
  "move-channel": ({ context, user, state, actions, serverId, channelId }) => ({
    description: `Move the current channel one step in the given direction ("up" or "down")`,
    arguments: ["direction"],
    execute: async ({ args, editor }) => {
      const [direction] = args;
      if (!["up", "down"].includes(direction)) {
        alert(`"${direction}" is not a valid direction!`);
        return;
      }

      const serverChannelSections = state.selectServerChannelSections(serverId);
      const currentSection = serverChannelSections.find((s) =>
        s.channelIds.includes(channelId)
      );

      if (currentSection == null) {
        alert(
          "Currently not possible to sort channels without a parent section, sorry!"
        );
        return;
      }

      const currentChannelIndex = currentSection.channelIds.indexOf(channelId);

      const nextIndex = Math.max(
        0,
        Math.min(
          currentSection.channelIds.length - 1,
          direction === "up" ? currentChannelIndex - 1 : currentChannelIndex + 1
        )
      );

      const reorderedChannelIds = [...currentSection.channelIds];
      const temp = reorderedChannelIds[nextIndex];
      reorderedChannelIds[nextIndex] = channelId;
      reorderedChannelIds[currentChannelIndex] = temp;

      await actions.updateChannelSection(currentSection.id, {
        channelIds: reorderedChannelIds,
      });
      editor.clear();
    },
    exclude: () => {
      if (context != "server-channel") return true;
      const server = state.selectServer(serverId);
      return server?.ownerUserId !== user.id;
    },
  }),
  "star-channel": ({ navigate, state, actions, channelId }) => ({
    description: "Star this channel to list it on your home screen",
    execute: async ({ editor }) => {
      const channels = state.selectStarredChannels();
      const isStarred = channels.some((c) => c.id === channelId);
      if (!isStarred) await actions.starChannel(channelId);
      navigate(`/me/${channelId}`);
      editor.clear();
    },
    exclude: () => {
      const channels = state.selectStarredChannels();
      const isStarred = channels.some((c) => c.id === channelId);
      return isStarred;
    },
  }),
  "unstar-channel": ({ navigate, state, actions, channelId }) => ({
    description: "Unstar this channel to remove it from your home screen",
    execute: async ({ editor }) => {
      const channels = state.selectStarredChannels();
      const index = channels.findIndex((c) => c.id === channelId);
      await actions.unstarChannel(channelId);
      const indexToSelect = Math.max(0, index - 1);
      const channelsAfterUnstar = channels.filter((c) => c.id !== channelId);
      const channelToSelect = channelsAfterUnstar[indexToSelect];
      navigate(channelToSelect == null ? "/" : `/me/${channelToSelect.id}`);
      editor.clear();
    },
    exclude: () => {
      const channels = state.selectStarredChannels();
      return channels.every((c) => c.id !== channelId);
    },
  }),
  "add-member": ({ state, actions, channelId, user, ethersProvider }) => ({
    description: "Add a member to this channel",
    arguments: ["wallet-address-or-ens"],
    execute: async ({ args, editor }) => {
      const [walletAddressOrEns] = args;
      if (walletAddressOrEns == null) {
        alert("Please type a");
      }
      try {
        const address = await ethersProvider
          .resolveName(walletAddressOrEns)
          .then(getChecksumAddress);

        await actions.addMemberToChannel(channelId, address);
        editor.clear();
      } catch (e) {
        if (e.code === "INVALID_ARGUMENT") throw new Error("Invalid address");
        throw e;
      }
    },
    exclude: () => {
      const channel = state.selectChannel(channelId);
      return channel.kind !== "topic" || channel.ownerUserId !== user.id;
    },
  }),
};

export default commands;
