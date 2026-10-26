
package com.bookigma.bookigma.dto;

import java.time.LocalDateTime;

public class UserProfileDto {

    private Long id;
    private String username;
    private String email;
    private String fullName;
    private String bio;
    private String avatarUrl;
    private String bannerUrl;
    private String interests;
    private String hometown;
    private String currentLocation;
    private String maritalStatus;
    private String role;
    private Boolean active;
    private Integer points;
    private Integer streak;
    private Integer booksRead;
    private LocalDateTime createdAt;

    // Constructor không tham số để Jackson đọc JSON
    public UserProfileDto() {
    }

    // Constructor đầy đủ tham số
    public UserProfileDto(
            Long id,
            String username,
            String email,
            String fullName,
            String bio,
            String avatarUrl,
            String role,
            Boolean active,
            LocalDateTime createdAt
    ) {
        this.id = id;
        this.username = username;
        this.email = email;
        this.fullName = fullName;
        this.bio = bio;
        this.avatarUrl = avatarUrl;
        this.role = role;
        this.active = active;
        this.createdAt = createdAt;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getFullName() {
        return fullName;
    }

    public void setFullName(String fullName) {
        this.fullName = fullName;
    }

    public String getBio() {
        return bio;
    }

    public void setBio(String bio) {
        this.bio = bio;
    }

    public String getAvatarUrl() {
        return avatarUrl;
    }

    public void setAvatarUrl(String avatarUrl) {
        this.avatarUrl = avatarUrl;
    }

    public String getBannerUrl() {
        return bannerUrl;
    }

    public void setBannerUrl(String bannerUrl) {
        this.bannerUrl = bannerUrl;
    }

    public String getInterests() {
        return interests;
    }

    public void setInterests(String interests) {
        this.interests = interests;
    }

    public String getHometown() {
        return hometown;
    }

    public void setHometown(String hometown) {
        this.hometown = hometown;
    }

    public String getCurrentLocation() {
        return currentLocation;
    }

    public void setCurrentLocation(String currentLocation) {
        this.currentLocation = currentLocation;
    }

    public String getMaritalStatus() {
        return maritalStatus;
    }

    public void setMaritalStatus(String maritalStatus) {
        this.maritalStatus = maritalStatus;
    }

    public String getRole() {
        return role;
    }

    public void setRole(String role) {
        this.role = role;
    }

    public Boolean getActive() {
        return active;
    }

    public void setActive(Boolean active) {
        this.active = active;
    }

    public Integer getPoints() {
        return points;
    }

    public void setPoints(Integer points) {
        this.points = points;
    }

    public Integer getStreak() {
        return streak;
    }

    public void setStreak(Integer streak) {
        this.streak = streak;
    }

    public Integer getBooksRead() {
        return booksRead;
    }

    public void setBooksRead(Integer booksRead) {
        this.booksRead = booksRead;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}