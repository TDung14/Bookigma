import {
  useEffect,
  useState,
} from 'react';

import {
  useAuth,
  useToast,
} from '../hooks/useStore';

import {
  postApi,
} from '../services/api';

export default function Feed() {

  const {
    user,
  } = useAuth();

  const toast =
    useToast();

  const [
    posts,
    setPosts,
  ] = useState([]);

  const [
    content,
    setContent,
  ] = useState('');

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    submitting,
    setSubmitting,
  ] = useState(false);

  const loadPosts =
    async () => {

      try {

        setLoading(true);

        const data =
          await postApi.getAll();

        setPosts(
          Array.isArray(data)
            ? data
            : []
        );

      } catch (error) {

        toast(
          error.message ||
          'Không thể tải bài viết.',
          'error'
        );

      } finally {

        setLoading(false);
      }
    };

  useEffect(() => {

    loadPosts();

  }, []);

  const submit =
    async (event) => {

      event.preventDefault();

      if (!user) {

        toast(
          'Bạn cần đăng nhập.',
          'error'
        );

        return;
      }

      if (!content.trim()) {

        toast(
          'Nội dung không được để trống.',
          'error'
        );

        return;
      }

      try {

        setSubmitting(true);

        const post =
          await postApi.create({
            userId:
              Number(user.id),

            content:
              content.trim(),
          });

        setPosts(
          (previous) => [
            post,
            ...previous,
          ]
        );

        setContent('');

        toast(
          'Đăng bài thành công.'
        );

      } catch (error) {

        toast(
          error.message ||
          'Không thể đăng bài.',
          'error'
        );

      } finally {

        setSubmitting(false);
      }
    };

  return (
    <div>

      {user && (

        <form
          onSubmit={submit}
          style={{
            marginBottom: 20,
          }}
        >

          <textarea
            className="input"
            value={content}
            onChange={(event) =>
              setContent(
                event.target.value
              )
            }
            placeholder="Bạn đang nghĩ gì?"
            rows={4}
          />

          <button
            className="btn btn-primary"
            type="submit"
            disabled={submitting}
            style={{
              marginTop: 10,
            }}
          >
            {submitting
              ? 'Đang đăng...'
              : 'Đăng bài'}
          </button>

        </form>
      )}

      {loading && (
        <p>
          Đang tải...
        </p>
      )}

      {!loading &&
        posts.map(
          (post) => (

            <article
              key={post.id}
              className="card"
              style={{
                marginBottom: 15,
              }}
            >

              <div
                className="row"
                style={{
                  gap: 10,
                  marginBottom: 10,
                }}
              >

                <img
                  src={
                    post.avatarUrl
                  }
                  alt=""
                  className="avatar"
                  style={{
                    width: 40,
                    height: 40,
                  }}
                />

                <div>

                  <strong>
                    {post.fullName ||
                      post.username}
                  </strong>

                  <div className="tiny muted">
                    @{post.username}
                  </div>

                </div>

              </div>

              <p
                style={{
                  whiteSpace:
                    'pre-wrap',
                }}
              >
                {post.content}
              </p>

              {post.imageUrl && (
                <img
                  src={
                    post.imageUrl
                  }
                  alt=""
                  style={{
                    width:
                      '100%',
                    maxHeight: 400,
                    objectFit:
                      'cover',
                    borderRadius: 8,
                  }}
                />
              )}

            </article>
          )
        )}

    </div>
  );
}