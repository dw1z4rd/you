<script lang="ts">
	import '../app.css';
	let { children } = $props();
</script>

<svelte:head>
	<title>You.</title>
</svelte:head>

{@render children()}
