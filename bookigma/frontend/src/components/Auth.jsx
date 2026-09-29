import React, { useState } from 'react';
import { apiCall } from '../services/api';

export default function Auth({ onLoginSuccess }) {
    const [isLoginMode, setIsLoginMode] = useState(true);
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        fullName: ''
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (isLoginMode) {
                // Gọi API Đăng nhập
                const user = await apiCall('/auth/login', 'POST', {
                    username: formData.username,
                    password: formData.password
                });
                // Lưu user vào localStorage và gọi callback lên component cha
                localStorage.setItem('user', JSON.stringify(user));
                onLoginSuccess(user);
            } else {
                // Gọi API Đăng ký tài khoản mới (lưu vào database MySQL)
                const newUser = await apiCall('/auth/register', 'POST', {
                    username: formData.username,
                    email: formData.email,
                    password: formData.password,
                    fullName: formData.fullName
                });
                alert('Đăng ký tài khoản thành công! Vui lòng đăng nhập.');
                setIsLoginMode(true); // Chuyển về màn hình đăng nhập
            }
        } catch (err) {
            setError(err.message || 'Đã có lỗi xảy ra.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={styles.container}>
            <div style={styles.card}>
                <h2>{isLoginMode ? 'Đăng Nhập Bookigma' : 'Tạo Tài Khoản Mới'}</h2>
                {error && <p style={styles.error}>{error}</p>}
                
                <form onSubmit={handleSubmit} style={styles.form}>
                    {!isLoginMode && (
                        <>
                            <div style={styles.inputGroup}>
                                <label>Họ và tên:</label>
                                <input 
                                    type="text" 
                                    name="fullName" 
                                    value={formData.fullName} 
                                    onChange={handleChange} 
                                    required 
                                    style={styles.input}
                                />
                            </div>
                            <div style={styles.inputGroup}>
                                <label>Email:</label>
                                <input 
                                    type="email" 
                                    name="email" 
                                    value={formData.email} 
                                    onChange={handleChange} 
                                    required 
                                    style={styles.input}
                                />
                            </div>
                        </>
                    )}

                    <div style={styles.inputGroup}>
                        <label>Tên đăng nhập:</label>
                        <input 
                            type="text" 
                            name="username" 
                            value={formData.username} 
                            onChange={handleChange} 
                            required 
                            style={styles.input}
                        />
                    </div>

                    <div style={styles.inputGroup}>
                        <label>Mật khẩu:</label>
                        <input 
                            type="password" 
                            name="password" 
                            value={formData.password} 
                            onChange={handleChange} 
                            required 
                            style={styles.input}
                        />
                    </div>

                    <button type="submit" disabled={loading} style={styles.button}>
                        {loading ? 'Đang xử lý...' : (isLoginMode ? 'Đăng Nhập' : 'Đăng Ký')}
                    </button>
                </form>

                <p style={styles.switchText}>
                    {isLoginMode ? 'Chưa có tài khoản?' : 'Đã có tài khoản?'} {' '}
                    <span 
                        onClick={() => { setIsLoginMode(!isLoginMode); setError(''); }} 
                        style={styles.link}
                    >
                        {isLoginMode ? 'Đăng ký ngay' : 'Đăng nhập'}
                    </span>
                </p>
            </div>
        </div>
    );
}

const styles = {
    container: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#f4f6f8' },
    card: { width: '100%', maxWidth: '400px', padding: '30px', background: '#fff', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' },
    form: { display: 'flex', flexDirection: 'column', gap: '15px' },
    inputGroup: { display: 'flex', flexDirection: 'column', gap: '5px', textAlign: 'left' },
    input: { padding: '10px', fontSize: '14px', borderRadius: '4px', border: '1px solid #ccc' },
    button: { padding: '12px', background: '#007bff', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '16px', cursor: 'pointer' },
    error: { color: 'red', fontSize: '14px', marginBottom: '10px' },
    switchText: { marginTop: '15px', fontSize: '14px' },
    link: { color: '#007bff', cursor: 'pointer', fontWeight: 'bold' }
};