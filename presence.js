const PRESENCE_EVENT = 'presence:update';

function buildPresencePayload(channel, channelMembers) {
  const members = Array.from(channelMembers.values()).map((member) => ({
    socketId: member.socketId,
    userId: member.userId,
    name: member.name,
    joinedAt: member.joinedAt
  }));

  return {
    channel,
    count: members.length,
    members,
    updatedAt: new Date().toISOString()
  };
}

function attachPresence(io) {
  // channel -> (socketId -> member)
  const presenceByChannel = new Map();
  // socketId -> Set(channel)
  const channelsBySocket = new Map();

  function ensureChannel(channel) {
    if (!presenceByChannel.has(channel)) {
      presenceByChannel.set(channel, new Map());
    }
    return presenceByChannel.get(channel);
  }

  function ensureSocketChannels(socketId) {
    if (!channelsBySocket.has(socketId)) {
      channelsBySocket.set(socketId, new Set());
    }
    return channelsBySocket.get(socketId);
  }

  function parseSubscribePayload(payload) {
    if (typeof payload === 'string') {
      return { channel: payload, user: {} };
    }

    if (!payload || typeof payload !== 'object') {
      return { channel: '', user: {} };
    }

    return {
      channel: payload.channel || '',
      user: payload.user || {}
    };
  }

  function parseChannelPayload(payload) {
    if (typeof payload === 'string') return payload;
    if (payload && typeof payload === 'object' && typeof payload.channel === 'string') {
      return payload.channel;
    }
    return '';
  }

  function emitChannelPresence(channel) {
    const members = presenceByChannel.get(channel);
    const payload = buildPresencePayload(channel, members || new Map());
    io.to(channel).emit(PRESENCE_EVENT, payload);
  }

  function addMember(socket, channel, user) {
    const members = ensureChannel(channel);
    const socketChannels = ensureSocketChannels(socket.id);

    const userId = user.userId || user.id || socket.id;
    const name = user.name || user.displayName || user.username || userId;

    members.set(socket.id, {
      socketId: socket.id,
      userId: String(userId),
      name: String(name),
      joinedAt: new Date().toISOString()
    });

    socketChannels.add(channel);
  }

  function removeMember(socketId, channel) {
    const members = presenceByChannel.get(channel);
    if (!members) return;

    members.delete(socketId);

    if (members.size === 0) {
      presenceByChannel.delete(channel);
    }

    const socketChannels = channelsBySocket.get(socketId);
    if (!socketChannels) return;

    socketChannels.delete(channel);
    if (socketChannels.size === 0) {
      channelsBySocket.delete(socketId);
    }
  }

  io.on('connection', (socket) => {
    socket.on('subscribe', (payload) => {
      const { channel, user } = parseSubscribePayload(payload);
      if (!channel) return;

      addMember(socket, channel, user);
      emitChannelPresence(channel);
    });

    socket.on('leave', (payload) => {
      const channel = parseChannelPayload(payload);
      if (!channel) return;

      removeMember(socket.id, channel);
      emitChannelPresence(channel);
    });

    socket.on('disconnect', () => {
      const socketChannels = channelsBySocket.get(socket.id);
      if (!socketChannels || socketChannels.size === 0) return;

      const channels = Array.from(socketChannels);
      for (const channel of channels) {
        removeMember(socket.id, channel);
        emitChannelPresence(channel);
      }
    });
  });

  return {
    getChannelPresence(channel) {
      const members = presenceByChannel.get(channel) || new Map();
      return buildPresencePayload(channel, members);
    }
  };
}

module.exports = {
  attachPresence,
  PRESENCE_EVENT
};
