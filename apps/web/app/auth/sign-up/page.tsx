import { redirect } from 'next/navigation';
import pathsConfig from '~/config/paths.config';

export const generateMetadata = async () => {
  return {
    title: 'Sign Up',
  };
};

export default function SignUpPage() {
  redirect(pathsConfig.auth.signIn);
}
