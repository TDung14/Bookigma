package com.bookigma.bookigma.chat.repository;

import com.bookigma.bookigma.chat.entity.ChatConversation;
import com.bookigma.bookigma.chat.entity.ChatType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ChatConversationRepository extends JpaRepository<ChatConversation, Long> {

    @Query("select c from ChatConversation c join c.participantIds p where p = :userId order by c.updatedAt desc")
    List<ChatConversation> findByParticipantId(@Param("userId") Long userId);

    @Query("select c from ChatConversation c where c.type = :type and :userA member of c.participantIds and :userB member of c.participantIds")
    Optional<ChatConversation> findDirectConversation(@Param("type") ChatType type,
                                                    @Param("userA") Long userA,
                                                    @Param("userB") Long userB);

    @Query("select c from ChatConversation c where c.type = :type and c.name = :name")
    Optional<ChatConversation> findByTypeAndName(@Param("type") ChatType type, @Param("name") String name);
}
