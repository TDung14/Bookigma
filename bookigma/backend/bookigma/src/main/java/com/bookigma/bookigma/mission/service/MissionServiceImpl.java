package com.bookigma.bookigma.mission.service;

import com.bookigma.bookigma.dto.PointTransactionDto;
import com.bookigma.bookigma.entity.User;
import com.bookigma.bookigma.exception.ApiException;
import com.bookigma.bookigma.mission.dto.MissionDtos;
import com.bookigma.bookigma.mission.entity.DailyMission;
import com.bookigma.bookigma.mission.repository.DailyMissionRepository;
import com.bookigma.bookigma.service.AccessGuard;
import com.bookigma.bookigma.service.PointService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
public class MissionServiceImpl implements MissionService {

    private static final ZoneId VN_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    private final DailyMissionRepository missionRepository;
    private final PointService pointService;
    private final AccessGuard accessGuard;

    public MissionServiceImpl(DailyMissionRepository missionRepository,
                              PointService pointService,
                              AccessGuard accessGuard) {
        this.missionRepository = missionRepository;
        this.pointService = pointService;
        this.accessGuard = accessGuard;
    }

    @Override
    @Transactional
    public MissionDtos.DailyMissionDto getToday(Long userId) {
        return toDto(getOrCreate(userId, today()));
    }

    @Override
    @Transactional
    public MissionDtos.DailyMissionDto recordReading(Long userId, int seconds) {
        if (seconds <= 0) return getToday(userId);
        DailyMission state = getOrCreate(userId, today());
        state.setReadSeconds(state.getReadSeconds() + seconds);
        missionRepository.save(state);
        return toDto(state);
    }

    @Override
    @Transactional
    public MissionDtos.DailyMissionDto recordChapter(Long userId) {
        DailyMission state = getOrCreate(userId, today());
        state.setChapters(state.getChapters() + 1);
        missionRepository.save(state);
        return toDto(state);
    }

    @Override
    @Transactional
    public MissionDtos.DailyMissionDto recordSocial(Long userId) {
        DailyMission state = getOrCreate(userId, today());
        state.setSocialCount(state.getSocialCount() + 1);
        missionRepository.save(state);
        return toDto(state);
    }

    @Override
    @Transactional
    public MissionDtos.DailyMissionDto recordExplore(Long userId, Long bookId) {
        if (bookId == null) return getToday(userId);
        DailyMission state = getOrCreate(userId, today());
        Set<String> seen = parseIds(state.getExploreBookIds());
        if (seen.add(String.valueOf(bookId))) {
            state.setExploreBookIds(String.join(",", seen));
            state.setExploreCount(seen.size());
            missionRepository.save(state);
        }
        return toDto(state);
    }

    @Override
    @Transactional
    public MissionDtos.ClaimResponse claim(Long userId, String taskId) {
        MissionTask task = MissionTask.find(taskId)
                .orElseThrow(() -> ApiException.badRequest("Nhiệm vụ không tồn tại."));
        LocalDate date = today();
        User user = accessGuard.requireUser(userId);

        DailyMission state = missionRepository.findForUpdate(userId, date)
                .orElseGet(() -> missionRepository.save(newState(user, date)));

        if (isClaimed(state, task)) {
            throw ApiException.conflict("Bạn đã nhận thưởng nhiệm vụ này hôm nay.");
        }
        if (progressOf(state, task) < task.goal()) {
            throw ApiException.conflict("Nhiệm vụ chưa hoàn thành.");
        }

        setClaimed(state, task, true);
        missionRepository.save(state);

        PointTransactionDto tx = pointService.addRewardPoints(
                userId,
                task.reward(),
                "TASK_REWARD",
                date + ":" + task.id(),
                "Hoàn thành nhiệm vụ: " + task.label()
        );

        return MissionDtos.ClaimResponse.builder()
                .amount(tx.getAmount())
                .balanceAfter(tx.getBalanceAfter())
                .missions(toDto(state))
                .build();
    }

    private DailyMission getOrCreate(Long userId, LocalDate date) {
        User user = accessGuard.requireUser(userId);
        return missionRepository.findByUser_IdAndMissionDate(userId, date)
                .orElseGet(() -> missionRepository.save(newState(user, date)));
    }

    private DailyMission newState(User user, LocalDate date) {
        return DailyMission.builder()
                .user(user)
                .missionDate(date)
                .readSeconds(0)
                .chapters(0)
                .socialCount(0)
                .exploreCount(0)
                .exploreBookIds("")
                .read10Claimed(false)
                .chapterClaimed(false)
                .socialClaimed(false)
                .exploreClaimed(false)
                .build();
    }

    private int progressOf(DailyMission state, MissionTask task) {
        return switch (task) {
            case READ_10 -> state.getReadSeconds() / 60;
            case CHAPTER -> state.getChapters();
            case SOCIAL -> state.getSocialCount();
            case EXPLORE -> state.getExploreCount();
        };
    }

    private boolean isClaimed(DailyMission state, MissionTask task) {
        return switch (task) {
            case READ_10 -> Boolean.TRUE.equals(state.getRead10Claimed());
            case CHAPTER -> Boolean.TRUE.equals(state.getChapterClaimed());
            case SOCIAL -> Boolean.TRUE.equals(state.getSocialClaimed());
            case EXPLORE -> Boolean.TRUE.equals(state.getExploreClaimed());
        };
    }

    private void setClaimed(DailyMission state, MissionTask task, boolean claimed) {
        switch (task) {
            case READ_10 -> state.setRead10Claimed(claimed);
            case CHAPTER -> state.setChapterClaimed(claimed);
            case SOCIAL -> state.setSocialClaimed(claimed);
            case EXPLORE -> state.setExploreClaimed(claimed);
        }
    }

    private MissionDtos.DailyMissionDto toDto(DailyMission state) {
        Map<String, Integer> counters = new LinkedHashMap<>();
        counters.put("readMinutes", state.getReadSeconds() / 60);
        counters.put("chapters", state.getChapters());
        counters.put("social", state.getSocialCount());
        counters.put("explore", state.getExploreCount());

        List<String> claimed = new ArrayList<>();
        List<MissionDtos.TaskDto> tasks = new ArrayList<>();
        for (MissionTask task : MissionTask.values()) {
            boolean taskClaimed = isClaimed(state, task);
            int progress = Math.min(task.goal(), progressOf(state, task));
            boolean done = progress >= task.goal();
            if (taskClaimed) claimed.add(task.id());

            tasks.add(MissionDtos.TaskDto.builder()
                    .id(task.id())
                    .label(task.label())
                    .hint(task.hint())
                    .metric(task.metric())
                    .goal(task.goal())
                    .reward(task.reward())
                    .progress(progress)
                    .percent(Math.round(progress * 100f / task.goal()))
                    .done(done)
                    .claimed(taskClaimed)
                    .build());
        }

        return MissionDtos.DailyMissionDto.builder()
                .date(state.getMissionDate())
                .counters(counters)
                .claimed(claimed)
                .tasks(tasks)
                .build();
    }

    private Set<String> parseIds(String raw) {
        if (raw == null || raw.isBlank()) return new LinkedHashSet<>();
        return Arrays.stream(raw.split(","))
                .map(String::trim)
                .filter(value -> !value.isEmpty())
                .collect(LinkedHashSet::new, Set::add, Set::addAll);
    }

    private LocalDate today() {
        return LocalDate.now(VN_ZONE);
    }
}
