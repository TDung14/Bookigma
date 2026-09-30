package com.bookigma.bookigma.entity;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Lưu danh sách chuỗi (ví dụ từ khoá của sách) thành một cột VARCHAR, các phần tử cách nhau bởi dấu phẩy.
 */
@Converter
public class StringListConverter implements AttributeConverter<List<String>, String> {
    private static final String SEPARATOR = ",";

    @Override
    public String convertToDatabaseColumn(List<String> values) {
        if (values == null || values.isEmpty()) {
            return null;
        }
        String joined = values.stream()
                .map(String::trim)
                .filter(value -> !value.isEmpty())
                .collect(Collectors.joining(SEPARATOR));
        return joined.isEmpty() ? null : joined;
    }

    @Override
    public List<String> convertToEntityAttribute(String column) {
        if (column == null || column.isBlank()) {
            return new ArrayList<>();
        }
        return Arrays.stream(column.split(SEPARATOR))
                .map(String::trim)
                .filter(value -> !value.isEmpty())
                .collect(Collectors.toCollection(ArrayList::new));
    }
}
