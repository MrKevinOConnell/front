import React from "react";
import { NavLink, Outlet, useParams } from "react-router-dom";
import { css } from "@emotion/react";
import { useAppScope, useAuth, arrayUtils } from "@shades/common";
import useSideMenu from "../hooks/side-menu";
import { Hash as HashIcon } from "./icons";
import Avatar from "./avatar";
import MainMenu from "./main-menu";
import SideMenuLayout from "./side-menu-layout";
import NotificationBadge from "./notification-badge";

const { reverse, groupBy } = arrayUtils;

export const HomeLayout = () => {
  const params = useParams();
  const { state } = useAppScope();

  const starredChannels = state.selectStarredChannels();
  const selectedChannel =
    params.channelId == null ? null : state.selectChannel(params.channelId);

  const selectedChannelIsStarred = starredChannels.some(
    (c) => c.id === params.channelId
  );

  const channelsByKind = React.useMemo(
    () => groupBy((c) => c.kind ?? "server", starredChannels),
    [starredChannels]
  );

  const topicChannels = channelsByKind.topic ?? [];
  const dmChannels = channelsByKind.dm ?? [];

  const serverChannelsByServerName = React.useMemo(
    () =>
      groupBy(
        (c) => state.selectServer(c.serverId).name,
        channelsByKind.server ?? []
      ),
    [state, channelsByKind.server]
  );

  if (selectedChannel == null && starredChannels.length === 0)
    return (
      <div
        css={(theme) =>
          css({
            height: "100%",
            display: "flex",
            background: theme.colors.backgroundSecondary,
          })
        }
      >
        <MainMenu />
        <Outlet />
      </div>
    );

  return (
    <SideMenuLayout
      filterable
      sidebarContent={
        <>
          {!selectedChannelIsStarred && selectedChannel != null && (
            <>
              <div style={{ height: "1.5rem" }} />
              {selectedChannel.kind === "dm" ? (
                <DmChannelItem
                  name={selectedChannel.name}
                  link={`/me/${selectedChannel.id}`}
                  hasUnread={state.selectChannelHasUnread(selectedChannel.id)}
                  notificationCount={state.selectChannelMentionCount(
                    selectedChannel.id
                  )}
                  memberUserIds={selectedChannel.memberUserIds}
                />
              ) : (
                <ChannelItem
                  link={`/me/${selectedChannel.id}`}
                  channelId={selectedChannel.id}
                  name={selectedChannel.name}
                  hasUnread={state.selectChannelHasUnread(selectedChannel.id)}
                  mentionCount={state.selectChannelMentionCount(
                    selectedChannel.id
                  )}
                />
              )}
            </>
          )}

          {topicChannels.length !== 0 && (
            <>
              <div style={{ height: "1.5rem" }} />
              {topicChannels.map((c) => (
                <DmChannelItem
                  key={c.id}
                  name={c.name}
                  link={`/me/${c.id}`}
                  hasUnread={state.selectChannelHasUnread(c.id)}
                  notificationCount={state.selectChannelMentionCount(c.id)}
                  memberUserIds={c.memberUserIds}
                />
              ))}
            </>
          )}

          {Object.entries(serverChannelsByServerName).map(
            ([title, channels]) => (
              <Section key={title} title={title}>
                {channels.map((c) => (
                  <ChannelItem
                    key={c.id}
                    link={`/me/${c.id}`}
                    channelId={c.id}
                    name={c.name}
                    hasUnread={state.selectChannelHasUnread(c.id)}
                    mentionCount={state.selectChannelMentionCount(c.id)}
                  />
                ))}
              </Section>
            )
          )}

          {dmChannels.length !== 0 && (
            <Section title="Direct messages">
              {dmChannels.map((c) => (
                <DmChannelItem
                  key={c.id}
                  name={c.name}
                  link={`/me/${c.id}`}
                  hasUnread={state.selectChannelHasUnread(c.id)}
                  notificationCount={state.selectChannelMentionCount(c.id)}
                  memberUserIds={c.memberUserIds}
                />
              ))}
            </Section>
          )}

          <div style={{ height: "2rem" }} />
        </>
      }
    >
      <Outlet />
    </SideMenuLayout>
  );
};

export const ServerLayout = () => {
  const params = useParams();

  const { user } = useAuth();
  const { actions, state } = useAppScope();

  const server = state.selectServer(params.serverId);

  const channels = state.selectServerChannels(params.serverId);
  const channelSections = state.selectServerChannelSections(params.serverId);
  const serverDmChannels = state.selectServerDmChannels(params.serverId);

  const [sections, channelsWithoutSection] = React.useMemo(() => {
    const sections = [];
    for (let section of channelSections) {
      const sectionChannels = section.channelIds.map((id) =>
        channels.find((c) => c.id === id)
      );
      if (sectionChannels.some((c) => c == null))
        console.warn("`null` channel in section data");
      sections.push({
        ...section,
        channels: sectionChannels.filter(Boolean),
      });
    }
    const sectionChannelIds = sections.flatMap((s) =>
      s.channels.map((c) => c.id)
    );
    const channelsWithoutSection = channels.filter(
      (c) => !sectionChannelIds.includes(c.id)
    );

    return [sections, channelsWithoutSection];
  }, [channels, channelSections]);

  const hasSections = sections.length > 0;

  if (server == null) return null;

  return (
    <SideMenuLayout
      title={server.name}
      sidebarContent={
        <>
          {channelsWithoutSection.length > 0 && (
            <>
              {hasSections && <div style={{ height: "1.5rem" }} />}

              <Section
                title={hasSections ? null : "Channels"}
                addAction={
                  server.ownerUserId === user.id
                    ? {
                        "aria-label": "Create channel",
                        run: () => {
                          const name = prompt("Create channel", "My channel");
                          if (name == null) return;
                          actions.createServerChannel(params.serverId, {
                            name,
                          });
                        },
                      }
                    : undefined
                }
              >
                {channelsWithoutSection.map((c) => (
                  <ChannelItem
                    key={c.id}
                    channelId={c.id}
                    serverId={params.serverId}
                    name={c.name}
                    hasUnread={state.selectChannelHasUnread(c.id)}
                    mentionCount={state.selectChannelMentionCount(c.id)}
                  />
                ))}
              </Section>
            </>
          )}

          {sections.map((s, i) => (
            <React.Fragment key={s.id}>
              {(channelsWithoutSection.length > 0 || i !== 0) && (
                <div style={{ height: "0.7rem" }} />
              )}
              <Section title={s.name}>
                {s.channels.map((c) => (
                  <ChannelItem
                    key={c.id}
                    channelId={c.id}
                    serverId={params.serverId}
                    name={c.name}
                    hasUnread={state.selectChannelHasUnread(c.id)}
                    mentionCount={state.selectChannelMentionCount(c.id)}
                  />
                ))}
              </Section>
            </React.Fragment>
          ))}

          {serverDmChannels.length > 0 && (
            <>
              <div style={{ height: "1.5rem" }} />
              <Section title="Direct messages">
                {serverDmChannels.map((c) => (
                  <DmChannelItem
                    key={c.id}
                    name={c.name}
                    link={`/channels/${params.serverId}/${c.id}`}
                    hasUnread={state.selectChannelHasUnread(c.id)}
                    notificationCount={state.selectChannelMentionCount(c.id)}
                    memberUserIds={c.memberUserIds}
                  />
                ))}
              </Section>
            </>
          )}

          <div style={{ height: "2rem" }} />
        </>
      }
    >
      <Outlet />
    </SideMenuLayout>
  );
};

export const DirectMessagesLayout = () => {
  const { state } = useAppScope();

  const dmChannels = state.selectDmChannels();

  return (
    <SideMenuLayout
      title="Direct messages"
      sidebarContent={
        <>
          <div style={{ height: "1.5rem" }} />
          {dmChannels.map((c) => (
            <DmChannelItem
              key={c.id}
              name={c.name}
              link={`/dms/${c.id}`}
              hasUnread={state.selectChannelHasUnread(c.id)}
              notificationCount={state.selectChannelMentionCount(c.id)}
              memberUserIds={c.memberUserIds}
              size="large"
            />
          ))}
        </>
      }
    >
      <Outlet />
    </SideMenuLayout>
  );
};

const Section = ({ title, addAction, children }) => (
  <div css={css({ position: "relative" })}>
    {title != null && (
      <div
        css={(theme) => css`
          position: sticky;
          top: 0;
          text-transform: uppercase;
          font-size: 1.2rem;
          font-weight: 500;
          color: rgb(255 255 255 / 40%);
          padding: 1.5rem 0.8rem 0.4rem 0.4rem;
          /* padding-left: 0.6rem; */
          /* padding-right: 0.8rem; */
          display: grid;
          align-items: center;
          grid-template-columns: minmax(0, 1fr) auto;
          grid-gap: 1rem;
          background: linear-gradient(
            -180deg,
            ${theme.colors.backgroundSecondary} 85%,
            transparent
          );

          button {
            padding: 0.2rem;
            background: none;
            border: 0;
            color: inherit;
            cursor: pointer;

            &:hover {
              color: white;
            }
          }
        `}
      >
        <div>{title}</div>
        {addAction && (
          <button aria-label={addAction["aria-label"]} onClick={addAction.run}>
            <Plus width="1.6rem" />
          </button>
        )}
      </div>
    )}

    {children}
  </div>
);

const ChannelItem = ({
  link,
  serverId,
  channelId,
  name,
  hasUnread,
  mentionCount,
}) => {
  const { isFloating: isFloatingMenuEnabled, toggle: toggleMenu } =
    useSideMenu();
  const closeMenu = () => {
    if (isFloatingMenuEnabled) toggleMenu();
  };
  return (
    <div
      css={(theme) => css`
        &:not(:last-of-type) {
          margin-bottom: 2px;
        }
        a {
          display: flex;
          align-items: center;
          width: 100%;
          border: 0;
          font-size: 1.5rem;
          font-weight: 500;
          text-align: left;
          background: transparent;
          border-radius: 0.4rem;
          cursor: pointer;
          color: rgb(255 255 255 / 40%);
          padding: 0.6rem 0.8rem;
          text-decoration: none;
          line-height: 1.3;
        }
        a.active {
          background: ${theme.colors.backgroundModifierSelected};
        }
        a:not(.active):hover {
          background: ${theme.colors.backgroundModifierHover};
        }
        .name {
          flex: 1;
          min-width: 0;
          white-space: nowrap;
          text-overflow: ellipsis;
          overflow: hidden;
        }
        a.active > .name,
        a:hover > .name {
          color: white;
        }
      `}
    >
      <NavLink
        to={link ?? `/channels/${serverId}/${channelId}`}
        className={({ isActive }) => (isActive ? "active" : "")}
        onClick={closeMenu}
      >
        <HashIcon
          style={{
            display: "inline-flex",
            width: "1.5rem",
            marginRight: "0.6rem",
          }}
        />
        <span
          className="name"
          style={{ color: hasUnread ? "white" : undefined }}
        >
          {name}
        </span>
        {mentionCount > 0 && <NotificationBadge count={mentionCount} />}
      </NavLink>
    </div>
  );
};

export const DmChannelItem = ({
  link,
  name,
  memberUserIds,
  hasUnread,
  notificationCount,
  size,
}) => {
  const { state } = useAppScope();
  const { user } = useAuth();

  const { isFloating: isFloatingMenuEnabled, toggle: toggleMenu } =
    useSideMenu();
  const closeMenu = () => {
    if (isFloatingMenuEnabled) toggleMenu();
  };

  const memberUsers = memberUserIds.map(state.selectUser);
  const memberUsersExcludingMe = memberUsers.filter((u) => u.id !== user.id);

  const avatarSize = size === "large" ? "3.2rem" : "1.8rem";
  const avatarPixelSize = size === "large" ? 32 : 18;
  const avatarBorderRadius = size === "large" ? "0.3rem" : "0.2rem";

  return (
    <div
      css={(theme) => css`
        &:not(:last-of-type) {
          margin-bottom: 2px;
        }
        a {
          display: flex;
          align-items: center;
          width: 100%;
          border: 0;
          font-size: 1.5rem;
          font-weight: 500;
          text-align: left;
          background: transparent;
          border-radius: 0.4rem;
          cursor: pointer;
          color: rgb(255 255 255 / 40%);
          padding: 0.6rem 0.7rem;
          text-decoration: none;
          line-height: 1.3;
        }
        a.active {
          background: ${theme.colors.backgroundModifierSelected};
        }
        a:not(.active):hover {
          background: ${theme.colors.backgroundModifierHover};
        }
        .title,
        .subtitle {
          white-space: nowrap;
          text-overflow: ellipsis;
          overflow: hidden;
        }
        .subtitle {
          font-size: 1.2rem;
          font-weight: 400;
          line-height: 1.2;
        }
        a.active,
        a:hover {
          color: ${theme.colors.textNormal};
        }
      `}
    >
      <NavLink
        to={link}
        className={({ isActive }) => (isActive ? "active" : "")}
        onClick={closeMenu}
      >
        <span style={{ marginRight: size === "large" ? "1rem" : "0.6rem" }}>
          {memberUsersExcludingMe.length <= 1 ? (
            <Avatar
              url={
                (memberUsersExcludingMe[0] ?? memberUsers[0])?.profilePicture
                  .small
              }
              walletAddress={
                (memberUsersExcludingMe[0] ?? memberUsers[0])?.walletAddress
              }
              size={avatarSize}
              pixelSize={avatarPixelSize}
              borderRadius={avatarBorderRadius}
            />
          ) : (
            <div
              style={{
                width: avatarSize,
                height: avatarSize,
                position: "relative",
              }}
            >
              {reverse(memberUsersExcludingMe.slice(0, 2)).map((user, i) => (
                <Avatar
                  key={user.id}
                  url={user?.profilePicture.small}
                  walletAddress={user?.walletAddress}
                  size={avatarSize}
                  pixelSize={avatarPixelSize}
                  borderRadius={avatarBorderRadius}
                  css={css({
                    position: "absolute",
                    top: i === 0 ? "3px" : 0,
                    left: i === 0 ? "3px" : 0,
                    width: "calc(100% - 3px)",
                    height: "calc(100% - 3px)",
                    boxShadow:
                      i !== 0 ? `1px 1px 0 0px rgb(0 0 0 / 30%)` : undefined,
                  })}
                />
              ))}
            </div>
          )}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            className="title"
            css={(theme) =>
              css({ color: hasUnread ? theme.colors.textNormal : undefined })
            }
          >
            {name}
          </div>
          {size === "large" && memberUserIds.length > 2 && (
            <div className="subtitle">{memberUserIds.length} members</div>
          )}
        </div>
        {notificationCount > 0 && (
          <NotificationBadge count={notificationCount} />
        )}
      </NavLink>
    </div>
  );
};

const Plus = ({ width = "auto", height = "auto" }) => (
  <svg
    aria-hidden="true"
    width="18"
    height="18"
    viewBox="0 0 18 18"
    style={{ display: "block", width, height }}
  >
    <polygon
      fillRule="nonzero"
      fill="currentColor"
      points="15 10 10 10 10 15 8 15 8 10 3 10 3 8 8 8 8 3 10 3 10 8 15 8"
    />
  </svg>
);
