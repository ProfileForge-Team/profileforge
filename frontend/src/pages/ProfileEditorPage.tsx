import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { demoProfile } from '../api/mockData';
import { useProfile, useUpdateProfile } from '../hooks/usePortfolio';
import { useUiStore } from '../stores/uiStore';

const optionalUrl = z.string().url('Введите корректную ссылку.').or(z.literal('')).optional();

const profileSchema = z.object({
  username: z.string().min(3, 'Минимум 3 символа.').max(32, 'Максимум 32 символа.'),
  displayName: z.string().min(2, 'Введите имя.'),
  headline: z.string().min(2, 'Укажите специализацию.'),
  bio: z.string().min(10, 'Добавьте немного информации о себе.'),
  skillsText: z.string().min(2, 'Добавьте хотя бы один навык.'),
  location: z.string().optional(),
  email: z.string().email('Введите корректный email.').or(z.literal('')).optional(),
  github: optionalUrl,
  telegram: optionalUrl,
  linkedin: optionalUrl
});

type ProfileForm = z.infer<typeof profileSchema>;

function toForm(profile: typeof demoProfile): ProfileForm {
  /** Converts the domain profile into form default values. */
  return {
    username: profile.username,
    displayName: profile.displayName,
    headline: profile.headline,
    bio: profile.bio,
    skillsText: profile.skills.join(', '),
    location: profile.location,
    email: profile.links.email ?? '',
    github: profile.links.github ?? '',
    telegram: profile.links.telegram ?? '',
    linkedin: profile.links.linkedin ?? ''
  };
}

export function ProfileEditorPage() {
  /** Renders the editable profile form and a live profile preview. */
  const profileQuery = useProfile();
  const profile = profileQuery.data ?? demoProfile;
  const updateProfile = useUpdateProfile();
  const showToast = useUiStore((state) => state.showToast);
  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: toForm(profile)
  });

  useEffect(() => {
    if (profileQuery.data) reset(toForm(profileQuery.data));
  }, [profileQuery.data, reset]);

  const preview = watch();
  const skills = (preview.skillsText ?? profile.skills.join(', '))
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 6);

  const submit = async (values: ProfileForm) => {
    try {
      await updateProfile.mutateAsync({
        username: values.username.trim(),
        displayName: values.displayName.trim(),
        headline: values.headline.trim(),
        bio: values.bio.trim(),
        skills: values.skillsText.split(',').map((item) => item.trim()).filter(Boolean),
        location: values.location?.trim() ?? '',
        links: {
          email: values.email?.trim() ?? '',
          github: values.github?.trim() ?? '',
          telegram: values.telegram?.trim() ?? '',
          linkedin: values.linkedin?.trim() ?? ''
        }
      });
      showToast('Профиль сохранён. Предпросмотр обновлён.');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Не удалось сохранить профиль.', 'error');
    }
  };

  return (
    <section className="page active legacy-page" id="editor">
      <div className="split-layout page-inner">
        <div className="glass-card reveal visible">
          <div className="eyebrow"><span /> PROFILE EDITOR</div>
          <h2>Редактор профиля</h2>
          <form className="form editor-form" onSubmit={handleSubmit(submit)}>
            <label>Username
              <input {...register('username')} />
              {errors.username && <small className="form-error">{errors.username.message}</small>}
            </label>
            <label>Имя
              <input {...register('displayName')} />
              {errors.displayName && <small className="form-error">{errors.displayName.message}</small>}
            </label>
            <label>Профессия
              <input {...register('headline')} />
              {errors.headline && <small className="form-error">{errors.headline.message}</small>}
            </label>
            <label>О себе
              <textarea {...register('bio')} />
              {errors.bio && <small className="form-error">{errors.bio.message}</small>}
            </label>
            <label>Навыки
              <input {...register('skillsText')} />
              {errors.skillsText && <small className="form-error">{errors.skillsText.message}</small>}
            </label>
            <label>Локация
              <input placeholder="Москва, Россия" {...register('location')} />
            </label>
            <label>Email для связи
              <input type="email" placeholder="you@example.com" {...register('email')} />
              {errors.email && <small className="form-error">{errors.email.message}</small>}
            </label>
            <label>GitHub
              <input placeholder="https://github.com/username" {...register('github')} />
              {errors.github && <small className="form-error">{errors.github.message}</small>}
            </label>
            <label>Telegram
              <input placeholder="https://t.me/username" {...register('telegram')} />
              {errors.telegram && <small className="form-error">{errors.telegram.message}</small>}
            </label>
            <label>LinkedIn
              <input placeholder="https://linkedin.com/in/username" {...register('linkedin')} />
              {errors.linkedin && <small className="form-error">{errors.linkedin.message}</small>}
            </label>
            <button type="submit" className="primary-btn wide" disabled={updateProfile.isPending}>
              {updateProfile.isPending ? 'Сохраняем…' : 'Сохранить профиль'}
            </button>
          </form>
        </div>

        <div className="preview-card reveal visible delay-1">
          <img src="/assets/minimal_resume.jpeg" alt="Предпросмотр резюме" />
          <div className="profile-card-overlay glass-card">
            <img src={profile.avatarUrl ?? '/assets/avatar_hologram.jpeg'} alt="Аватар профиля" />
            <h3>{preview.displayName || profile.displayName}</h3>
            <p>{preview.headline || profile.headline}</p>
            <p className="editor-preview-bio">{preview.bio || profile.bio}</p>
            <div className="chips">{skills.map((skill) => <span key={skill}>{skill}</span>)}</div>
          </div>
        </div>
      </div>
    </section>
  );
}
