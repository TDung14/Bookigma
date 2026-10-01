package com.bookigma.bookigma.friend.service;

import com.bookigma.bookigma.entity.User;
import com.bookigma.bookigma.friend.dto.FriendStateDto;
import com.bookigma.bookigma.friend.dto.FriendUserDto;
import com.bookigma.bookigma.friend.entity.FriendRequest;
import com.bookigma.bookigma.friend.repository.FriendRequestRepository;
import com.bookigma.bookigma.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
public class FriendService {
    private final FriendRequestRepository repository;
    private final UserRepository userRepository;

    public FriendService(FriendRequestRepository repository, UserRepository userRepository) {
        this.repository = repository;
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public FriendStateDto getState(Long userId) {
        requireUser(userId);
        List<FriendRequest> accepted = repository.findAllForUserByStatus(userId, FriendRequest.Status.ACCEPTED);
        List<FriendRequest> sent = repository.findByRequester_IdAndStatus(userId, FriendRequest.Status.PENDING);
        List<FriendRequest> received = repository.findByReceiver_IdAndStatus(userId, FriendRequest.Status.PENDING);

        List<FriendUserDto> friends = accepted.stream().map(f -> toDto(otherUser(f, userId))).distinct().toList();
        List<FriendUserDto> sentUsers = sent.stream().map(f -> toDto(f.getReceiver())).toList();
        List<FriendUserDto> receivedUsers = received.stream().map(f -> toDto(f.getRequester())).toList();

        return FriendStateDto.builder()
                .friendIds(friends.stream().map(FriendUserDto::getId).toList())
                .sentPendingIds(sentUsers.stream().map(FriendUserDto::getId).toList())
                .receivedPendingIds(receivedUsers.stream().map(FriendUserDto::getId).toList())
                .friends(friends)
                .sentPendingUsers(sentUsers)
                .receivedPendingUsers(receivedUsers)
                .build();
    }

    @Transactional
    public FriendStateDto sendRequest(Long requesterId, Long receiverId) {
        User requester = requireUser(requesterId);
        User receiver = requireUser(receiverId);
        if (requesterId.equals(receiverId)) throw new IllegalArgumentException("Không thể kết bạn với chính mình.");

        List<FriendRequest> pair = repository.findPair(requesterId, receiverId);
        Optional<FriendRequest> accepted = pair.stream().filter(f -> f.getStatus() == FriendRequest.Status.ACCEPTED).findFirst();
        if (accepted.isPresent()) throw new IllegalArgumentException("Hai người đã là bạn bè.");

        Optional<FriendRequest> pending = pair.stream().filter(f -> f.getStatus() == FriendRequest.Status.PENDING).findFirst();
        if (pending.isPresent()) {
            FriendRequest existing = pending.get();
            if (existing.getRequester().getId().equals(requesterId)) throw new IllegalArgumentException("Bạn đã gửi lời mời kết bạn.");
            throw new IllegalArgumentException("Người này đã gửi lời mời kết bạn cho bạn.");
        }

        FriendRequest record = pair.stream().filter(f -> f.getRequester().getId().equals(requesterId) && f.getReceiver().getId().equals(receiverId)).findFirst().orElse(null);
        if (record == null) {
            record = FriendRequest.builder().requester(requester).receiver(receiver).status(FriendRequest.Status.PENDING).build();
        } else {
            record.setStatus(FriendRequest.Status.PENDING);
            record.setUpdatedAt(java.time.LocalDateTime.now());
        }
        repository.save(record);
        return getState(requesterId);
    }

    @Transactional
    public FriendStateDto accept(Long receiverId, Long requesterId) {
        FriendRequest request = findPending(requesterId, receiverId);
        request.setStatus(FriendRequest.Status.ACCEPTED);
        repository.save(request);
        return getState(receiverId);
    }

    @Transactional
    public FriendStateDto reject(Long receiverId, Long requesterId) {
        FriendRequest request = findPending(requesterId, receiverId);
        request.setStatus(FriendRequest.Status.REJECTED);
        repository.save(request);
        return getState(receiverId);
    }

    @Transactional
    public FriendStateDto cancel(Long currentUserId, Long otherUserId) {
        requireUser(currentUserId);
        requireUser(otherUserId);
        FriendRequest request = repository.findPair(currentUserId, otherUserId).stream().findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy quan hệ bạn bè."));
        if (request.getStatus() == FriendRequest.Status.ACCEPTED) {
            request.setStatus(FriendRequest.Status.CANCELLED);
        } else if (request.getStatus() == FriendRequest.Status.PENDING && request.getRequester().getId().equals(currentUserId)) {
            request.setStatus(FriendRequest.Status.CANCELLED);
        } else {
            throw new IllegalArgumentException("Bạn không thể hủy lời mời này.");
        }
        repository.save(request);
        return getState(currentUserId);
    }

    private FriendRequest findPending(Long requesterId, Long receiverId) {
        return repository.findPair(requesterId, receiverId).stream()
                .filter(f -> f.getStatus() == FriendRequest.Status.PENDING && f.getRequester().getId().equals(requesterId) && f.getReceiver().getId().equals(receiverId))
                .findFirst().orElseThrow(() -> new IllegalArgumentException("Lời mời kết bạn không còn hiệu lực."));
    }

    private User otherUser(FriendRequest f, Long userId) {
        return f.getRequester().getId().equals(userId) ? f.getReceiver() : f.getRequester();
    }

    private User requireUser(Long id) {
        if (id == null) throw new IllegalArgumentException("Bạn cần đăng nhập.");
        return userRepository.findById(id).orElseThrow(() -> new IllegalArgumentException("Người dùng không tồn tại."));
    }

    private FriendUserDto toDto(User u) {
        return FriendUserDto.builder().id(u.getId()).username(u.getUsername()).fullName(u.getFullName())
                .avatarUrl(u.getAvatarUrl()).bio(u.getBio()).role(u.getRole() == null ? null : u.getRole().name()).build();
    }
}
